import * as io from 'socket.io';
import * as http from 'http';
import * as IDE from './main';
import * as project_manager from './ProjectManager';
import * as process_manager from './ProcessManager';
import * as git_manager from './GitManager';
import * as update_manager from './UpdateManager';
import * as project_settings from './ProjectSettings';
import * as ide_settings from './IDESettings';
import * as boot_project from './RunOnBoot';
import * as util from './utils';
var TerminalManager = require('./TerminalManager');
TerminalManager.on('shell-event', (evt: any, data: any) => ide_sockets.emit('shell-event', evt, data) );

// all connected sockets
let ide_sockets: SocketIO.Namespace;
let num_connections: number = 0;
let interval: NodeJS.Timer;
let intervalMs = 5000; // how often to scan for new projects

export function init(server: http.Server){
	ide_sockets = io(server, {
		pingInterval: 3000,
		pingTimeout: 100000
	}).of('/IDE');
	ide_sockets.on('connection', connection);
}

export function broadcast(event: string, message: any){
	// console.log('broadcasting', event, message);
	if (ide_sockets) ide_sockets.emit(event, message);
}

function connection(socket: SocketIO.Socket){
	socket.on('set-time', IDE.set_time);
	socket.on('project-event', (data: any) => project_event(socket, data) );
	socket.on('project-settings', (data: any) => project_settings_event(socket, data) );
	socket.on('process-event', (data: any) => process_event(socket, data) );
	socket.on('IDE-settings', (data: any) => ide_settings_event(socket, data) );
	socket.on('git-event', (data: any) => git_event(socket, data) );
	socket.on('list-files', (project: string) => list_files(socket, project) );
	socket.on('run-on-boot', (project: string) => boot_project.set_boot_project(socket, project) );
	socket.on('sh-command', cmd => TerminalManager.execute(cmd) );
	socket.on('sh-tab', cmd => TerminalManager.tab(cmd) );
	socket.on('upload-update', (data: any) => update_manager.upload(data) );
	socket.on('shutdown', IDE.shutdown);
	socket.on('disconnect', disconnect);
	init_message(socket);
	TerminalManager.pwd();
	num_connections += 1;
	if (num_connections === 1){
		interval = setTimeout(interval_func, intervalMs);
	}
}

function disconnect(){
	num_connections = num_connections - 1;
	if (num_connections <= 0 && interval){
		clearTimeout(interval);
	}
}

async function interval_func(){
	clearTimeout(interval);
	let projects: string[] = await project_manager.listProjects();
	ide_sockets.emit('project-list', undefined, projects);
	interval = setTimeout(interval_func, intervalMs);
}

async function init_message(socket: SocketIO.Socket){
	let message: util.Init_Message = {
		projects 	: await project_manager.listProjects(),
		examples 	: await project_manager.listExamples(),
    libraries 	: await project_manager.listLibraries(),
		settings 	: await ide_settings.read(),
		boot_project 	: await boot_project.get_boot_project(),
		board_string	: await IDE.board_detect().catch(e => console.log('error in board detect', e)),
		xenomai_version : await IDE.get_xenomai_version(),
		bela_image_version : await IDE.get_bela_image_version(),
		bela_core_version : await IDE.get_bela_core_version(),
//	status : await process_manager.status()
	};
	socket.emit('init', message);
}

// Process all websocket events which need to be handled by the ProjectManager
async function project_event(socket: SocketIO.Socket, data: any){
//	console.log('project-event');
//	console.dir(data);
	// reject any malformed websocket message
	if ((!data.currentProject && !data.newProject) || !data.func || !(project_manager as any)[data.func]) {
		console.log('bad project-event');
		console.dir(data, {depth:null});
		return;
	}
	// call the project_manager function specified in the func field of the ws message
	await (project_manager as any)[data.func](data)
		.catch( (e: Error) => {
			// in the event of an error, log it to the IDE console
			// and send a string back to the browser for display to the user
			console.log('project-event error:');
			console.log(e);
			data.error = e.toString();
			socket.emit('project-data', data);
		});
//	console.dir(data);
	// after a succesful operation, send the data back
	socket.emit('project-data', data);
	if (data.currentProject){
		// save the current project in the IDE settings
		ide_settings.setIDESetting({key: 'project', value: data.currentProject});
		// if a fileList was created, send it to other tabs
		if (data.fileList)
			socket.broadcast.emit('file-list', data.currentProject, data.fileList);
		// if a projectList was created, send it to other tabs
		if (data.projectList)
			socket.broadcast.emit('project-list', data.currentProject, data.projectList);
		// if a file was opened save this in the project settings
		if (data.fileName)
		{
			project_settings.set_fileName(data.currentProject, data.fileName);
		}
		if (!data.fileName && "deleteFile" === data.func)
		{
			console.log("Delete file, setting filename to null");
			project_settings.set_fileName(data.currentProject, null);
		}
	}
}

async function project_settings_event(socket: SocketIO.Socket, data: any){
//	console.log('project_settings')
//	console.dir(data);
	if (!data.currentProject || !data.func || !(project_settings as any)[data.func]) {
		console.log('bad project-settings', data);
		return;
	}
	let settings = await (project_settings as any)[data.func](data)
		.catch( (e: Error) => {
			console.log('project-settings error');
			console.log(e);
			socket.emit('report-error', e.toString());
		});
//	console.log('project_settings')
//	console.dir(settings);
	if (data.func === 'setCLArg'){
		socket.broadcast.emit('project-settings-data', data.currentProject, settings);
	} else {
		ide_sockets.emit('project-settings-data', data.currentProject, settings);
	}
}

async function process_event(socket: SocketIO.Socket, data: any){
	if (!data || !data.currentProject || !data.event || !(process_manager as any)[data.event]){
		console.log('bad process-event', data);
		return;
	}
	await (process_manager as any)[data.event](data);
}

async function ide_settings_event(socket: SocketIO.Socket, data: any){
	if (!data || !data.func || !(ide_settings as any)[data.func]){
		console.log('bad ide_settings event', data);
		return;
	}
	let result = await (ide_settings as any)[data.func](data)
		.catch( (e: Error) => console.log('ide_settings error', e) );
	broadcast('IDE-settings-data', result);
}

async function git_event(socket: SocketIO.Socket, data: any){
	if (!data.currentProject || !data.func || !(git_manager as any)[data.func]) {
		console.log('bad git-event', data);
		return;
	}
	try{
		await (git_manager as any)[data.func](data);
		let data2: any = {
			currentProject: data.currentProject,
			timestamp:	data.timestamp,
			gitData:	data
		};
		await project_manager.openProject(data2);
		socket.emit('project-data', data2);
		if (data2.currentProject){
			if (data2.projectList){
				socket.broadcast.emit('project-list', data2.currentProject, data2.projectList);
			}
			if (data2.fileList){
				socket.broadcast.emit('file-list', data2.currentProject, data2.fileList);
			}
			ide_settings.setIDESetting({key: 'project', value: data2.currentProject});
		}
	}
	catch(e){
		console.log('git-event error', e);
		data.error = e.toString();
		socket.emit('project-data', {gitData: data, timestamp: data.timestamp});
		socket.emit('report-error', e.toString());
	}
}

function arrayRemove(arr : Array<any>, value : any) {
	return arr.filter(function(ele : any){ return ele != value; });
}

var list_files_doing_it : Array<string> = [];
async function list_files(socket: SocketIO.Socket, project: string){
	// avoid piling up of tasks for the same client(browser tab) and project
	var slug = project + socket.id;
	if(list_files_doing_it.indexOf(slug) != -1) {
		return;
	}
	list_files_doing_it.push(slug);
	if(await project_manager.projectExists(project))
	{
		try {
			let files: util.File_Descriptor[] = await project_manager.listFiles(project);
			socket.emit('file-list', project, files);
		} catch (e) {
			console.log('error refreshing file list', e.toString());
		}
	}
	list_files_doing_it = arrayRemove(list_files_doing_it, slug);
}
