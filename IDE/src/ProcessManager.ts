import * as child_process from 'child_process';
import * as file_manager from './FileManager';
import * as socket_manager from './SocketManager';
import * as processes from './IDEProcesses';
import * as paths from './paths';
import * as util from './utils';
import { Lock } from './Lock';
import * as cpu_monitor from './CPUMonitor';
import * as path from 'path';
import { MostRecentQueue } from './MostRecentQueue';
import * as globals from './globals';

const lock: Lock = new Lock("ProcessManager");
let syntaxTimeout : NodeJS.Timer; // storing the value returned by setTimeout
const syntaxTimeoutMs = 300; // ms between received data and start of syntax checking
const extensionsForSyntaxCheck : Array<string> = [ '.cpp', '.c', '.h', '.hh', '.hpp' ];

function makePath (data : any) {
	return paths.projects+data.currentProject+'/'+data.newFile;
}

let queuedUploads = new MostRecentQueue();

// the file data is saved robustly using a lockfile, and a syntax
// check started if the flag is set
async function processUploads() {
	while(queuedUploads.size) {
		for(let id of queuedUploads.keys()) {
			if(globals.verbose)
				console.log("SAVING:", id);
			// grab data from the queue for processing
			let data = queuedUploads.pop(id);
			if(!data) {
				console.log("WARNING: processUpload: found no data for", id);
				continue;
			}
			try{
				await file_manager.save_file(makePath(data), data.fileData, paths.lockfile);
				if(globals.verbose)
					console.log("SAVED", id);
				var ext = path.extname(data.newFile);
				if (data.checkSyntax && (extensionsForSyntaxCheck.indexOf(ext) >= 0)) { // old typescript doesn't like .includes()
					clearTimeout(syntaxTimeout)
					syntaxTimeout = global.setTimeout(function (data: any) {
						checkSyntax(data);
					}.bind(null, {currentProject: data.currentProject}), syntaxTimeoutMs);
				}
			}
			catch(e){
				console.log(data);
				console.log(e);
			}
		}
	}
	lock.release();
}

// this function gets called whenever the ace editor is modified.
// New data will be pushed to the queue, overwriting any old data.
export async function upload(data: any){
	let id = makePath(data);
	queuedUploads.push(id, data);
	// notify all clients this file has been edited
	socket_manager.broadcast('file-changed', {
		currentProject: data.currentProject,
		fileName: data.newFile,
		clientId: data.clientId,
	});
	if(!lock.acquired) {
		await lock.acquire();
		// If not already running, process uploads at the first chance
		// note: this could actually be called directly from here (with or without await),
		// but this way it gives sort of a cleaner "thread-like" behaviour
		setTimeout(processUploads, 0);
	}
}

// this function starts a syntax check
// if a syntax check or build process is in progress they are stopped
// a running program is not stopped
// this can be called either from upload() or from the frontend (via SocketManager)
export function checkSyntax(data: any){
	if(!data.currentProject)
		return;
	let project : string = data.currentProject;
	if (processes.syntax.get_status()){
		processes.syntax.stop();
		processes.syntax.queue(() => processes.syntax.start(project));
	} else if (processes.build.get_status()){
		processes.build.stop();
		processes.build.queue( () => processes.syntax.start(project) );
	} else {
		processes.syntax.start(project);
	}
}

// this function is called when the run button is clicked
// if a program is already building or running it is stopped and restarted
// any syntax check in progress is stopped
export function run(data: any){
	cpu_monitor.stop();
	if (processes.run.get_status()){
		processes.run.stop();
		processes.run.queue( () => build_run(data.currentProject) );
	} else if (processes.build.get_status()){
		processes.build.stop();
		processes.build.queue( () => build_run(data.currentProject) );
	} else if (processes.syntax.get_status()){
		processes.syntax.stop();
		processes.syntax.queue( () => build_run(data.currentProject) );	
	} else {
		build_run(data.currentProject);
	}
}

// this function starts a build process and when it ends it checks
// if it was stopped by a call to stop() or if there were build errors
// if neither of these are true the project is immediately run
function build_run(project: string){
	processes.build.start(project);
	processes.build.queue( (stderr: string, killed: boolean, code: number) => {
		if (!killed && !code){
			processes.run.start(project); 
		}
	});
}

// this function parses the stderr output of the build process 
// returning true if build errors (not warnings) are found
function build_error(stderr: string): boolean {
	let lines: string[] = stderr.split('\n');
	for (let line of lines){
		let split_line: string[] = line.split(':');
		if (split_line.length >= 4){
			if (split_line[3] === ' error' || split_line[3] === ' fatal error'){
				return true;
			} else if (split_line[3] === ' warning'){
				//console.log('warning');
			}
		}
	}
	return false;
}


// this function is called when the stop button is clicked
// it calls the stop() method of any running process
// if there is no running process, 'make stop' is called
export function stop(){
	cpu_monitor.stop();
	let stopped: boolean = false;
	if (processes.run.get_status()){
		processes.run.stop();
		stopped = true;
	}
	if (processes.build.get_status()){
		processes.build.stop();
		stopped = true;
	}
	if (processes.syntax.get_status()){
		processes.syntax.stop();
		stopped = true;
	}
	if (!stopped){
		console.log('make -C '+paths.Bela+' stop');
		child_process.exec('make -C '+paths.Bela+' stop');	
	}
}

function get_status(): util.Process_Status {
	return {
		checkingSyntax	: processes.syntax.get_status(),
		building	: processes.build.get_status(),
		buildProject	: (processes.build.get_status() ? processes.build.project : ''),
		running		: processes.run.get_status(),
		runProject	: (processes.run.get_status() ? processes.run.project : '')
	};
}

// each process emits start and finish events, which are handled here
processes.syntax.on('start', (project: string) => socket_manager.broadcast('status', get_status()) );
processes.syntax.on('finish', (stderr: string, killed: boolean) => {
	if(!killed) {
		let status: util.Process_Status = get_status();
		status.syntaxError = stderr;
		socket_manager.broadcast('status', status);
	}
});

processes.build.on('start', (project: string) => socket_manager.broadcast('status', get_status()) );
processes.build.on('finish', (stderr: string, killed: boolean) => {
	let status: util.Process_Status = get_status();
	status.syntaxError = stderr;
	socket_manager.broadcast('status', status);
	if (!killed)
		socket_manager.broadcast('std-warn', stderr);
});
processes.build.on('stdout', (data) => socket_manager.broadcast('status', {buildLog: data}) );

processes.run.on('start', (pid: number, project: string) => {
	socket_manager.broadcast('status', get_status());
	cpu_monitor.start(pid, project, async cpu => {
		socket_manager.broadcast('cpu-usage', {
			bela: await file_manager.read_file(paths.xenomai_stat).catch(e => console.log('error reading xenomai stats', e)),
			belaLinux: cpu
		});
	});
});
processes.run.on('finish', (project: string) => {
	socket_manager.broadcast('status', get_status());
	cpu_monitor.stop();
});
processes.run.on('stdout', (data) => socket_manager.broadcast('status', {belaLog: data}) );
processes.run.on('stderr', (data) => socket_manager.broadcast('status', {belaLogErr: data}) );
