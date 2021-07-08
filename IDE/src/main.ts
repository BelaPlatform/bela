import * as express from 'express';
import * as http from 'http';
import * as multer from 'multer'
import * as child_process from 'child_process';
import * as socket_manager from './SocketManager';
import * as file_manager from './FileManager';
import * as paths from './paths';
import * as util from './utils';
import * as routes from './RouteManager';
import * as path from 'path';
import * as fs from 'fs-extra-promise';
import * as globals from './globals';
var TerminalManager = require('./TerminalManager');

export async function init(args : Array<any>){

	let httpPort = 80;
	// load customised "dev" settings, if available. See
	// IDE/ide-dev.js.template for details on the file content
	try {
		let ideDev = require('../ide-dev.js');
		if(ideDev) {
			console.log("ideDev: ", ideDev)
			if(ideDev.hasOwnProperty('Bela'))
				paths.set_Bela(ideDev.Bela);
			if(ideDev.hasOwnProperty('local_dev'))
				globals.set_local_dev(ideDev.local_dev);
			if(ideDev.hasOwnProperty('httpPort'))
				httpPort = ideDev.httpPort;
			if(ideDev.hasOwnProperty('verbose'))
				globals.set_verbose(ideDev.verbose);
		}
	} catch (err) {}
	let n = 0;
	while(n < args.length)
	{
		let arg = args[n];
		switch (arg) {
			case "-v":
				globals.set_verbose(1);
				break;
		}
		++n;
	}

	// ensure required folders exist
	await fs.mkdirp(paths.projects);
	console.log('starting IDE from ' + paths.Bela);

	await check_lockfile()
		.catch( (e: Error) => console.log('error checking lockfile', e) );

	// setup webserver
	const app: express.Application = express();
	const server: http.Server = new http.Server(app);
	setup_routes(app);

	// start serving the IDE
	server.listen(httpPort, () => console.log('listening on port', httpPort) );

	// initialise websocket
	socket_manager.init(server);

	TerminalManager.init();
}

let backup_file_stats: util.Backup_File_Stats = {};
export async function check_lockfile(){
	let lockfile_exists =  await file_manager.file_exists(paths.lockfile);
	if (!lockfile_exists){
		backup_file_stats.exists = false;
		return;
	}
	let file_path: string = await file_manager.read_file(paths.lockfile);
	let filename: string = path.basename(file_path);
	let project_path: string = path.dirname(file_path)+'/';
	let tmp_backup_file: string = project_path+'.'+filename+'~';
	let backup_file_exists: boolean = await file_manager.file_exists(tmp_backup_file);
	if (!backup_file_exists){
		backup_file_stats.exists = false;
		return;
	}
	let backup_filename: string = filename+'.bak';
	await file_manager.copy_file(tmp_backup_file, project_path+backup_filename);
	console.log('backup file copied to', project_path+backup_filename);
	backup_file_stats.exists = true;
	backup_file_stats.filename = filename;
	backup_file_stats.backup_filename = backup_filename;
	backup_file_stats.project = path.basename(project_path);
	await file_manager.delete_file(paths.lockfile);
}
export function get_backup_file_stats(): util.Backup_File_Stats {
	return backup_file_stats;
}

function setup_routes(app: express.Application){
	// static paths
	app.use(express.static(paths.webserver_root)); // all files in this directory are served to bela.local/
	app.use('/documentation', express.static(paths.Bela+'Documentation/html'));
	app.use('/projects', express.static(paths.Bela+'projects'));

	// ajax routes

  var storage = multer.diskStorage({
    destination: paths.uploads,
    filename: function (req, file, callback) {
      callback(null, file.originalname);
      console.log('file is', file);
    }
  });

  app.post('/uploads', function(req, res) {
      var upload = multer({ storage : storage}).single('data');
      upload(req, res, function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
      });
  });

	// file and project downloads
	app.get('/download', routes.download);
	// doxygen xml
	app.get('/documentation_xml', routes.doxygen);
	// examples
	app.use('/examples', express.static(paths.examples));
  // libs
	app.use('/libraries', express.static(paths.libraries));
	// gui
	app.use('/gui', express.static(paths.gui));
}

export function get_bela_core_version(): Promise<util.Bela_Core_Version_Data>{
	return new Promise(async (resolve, reject) => {
		var data : any = {};
		var updateLog : string;
		try {
			updateLog = await fs.readFileAsync(paths.update_log, 'utf8');
		} catch (e) { }
		if(updateLog) {
			var tokens = updateLog.toString().split('\n');
			// new update logs
			var matches = [ /^FILENAME=/, /^DATE=/, /^SUCCESS=/, /^METHOD=/];
			var keys = ['fileName', 'date', 'success', 'method'];
			for(let str of tokens) {
				for(let n in matches) {
					var reg = matches[n];
					if(str.match(reg)) {
						str = str.replace(reg, '').trim();
						data[keys[n]] = str;
					}
				}
			}
			if('true' === data.success)
				data.success = 1;
			else
				data.success = 0;

			if(!data.fileName && !data.date && !data.method){
				// old update logs, for backwards compatibilty:
				// - guess date from file's modification time
				// - fix method
				// - guess fileName from backup path
				// - get success from legacy string
				data = {};
				var stat = await fs.statAsync(paths.update_log);
				data.date = stat.mtime;
				data.method = 'make update (legacy)';
				var dir = await file_manager.read_directory(paths.update_backup);
				if(dir && dir.length > 1)
					data.fileName = dir[0];
				if(-1 !== updateLog.indexOf('Update successful'))
					data.success = 1;
				else
					data.success = -1; //unknown
			}
		}
		var cmd = 'git -C '+paths.Bela+' describe --always --dirty';
		child_process.exec(cmd,
			(err, stdout, stderr) => {
			if (err){
				console.log('error executing: ' + cmd);
			}
			var ret : util.Bela_Core_Version_Data = {
				fileName: data.fileName,
				date: data.date,
				method: data.method,
				success: data.success,
				git_desc: stdout.trim(),
				log: updateLog,
			}
			resolve(ret);
		});
	});
}

export function get_bela_image_version(): Promise<string>{
	return new Promise(async function(resolve, reject){
		try {
			var buffer = await fs.readFileAsync('/etc/motd', 'utf8');
			if(!buffer) {
				resolve('');
				return;
			}
			var tokens = buffer.toString().split('\n');
			var str : string;
			for(str of tokens) {
				if(str.match(/^Bela image.*/)) {
					var ret = str.replace(/^Bela image, /, '');
					resolve(ret);
					return;
				}
			}
		} catch (e) {
			console.log("ERROR: ", e);
		}
		resolve('');
	});
}
export function get_xenomai_version(): Promise<string>{
	if(globals.local_dev)
		return new Promise((resolve) => resolve("3.0"));
	return new Promise(function(resolve, reject){
		child_process.exec('/usr/xenomai/bin/xeno-config --version', (err, stdout, stderr) => {
			if (err){
				console.log('error reading xenomai version');
			}
			if (stdout.includes('2.6')){
				paths.set_xenomai_stat('/proc/xenomai/stat');
			} else if (stdout.includes('3.0')){
				paths.set_xenomai_stat('/proc/xenomai/sched/stat');
			}
			resolve(stdout);
		});
	});
}

export function set_time(time: string){
	if(globals.local_dev)
		return;
	child_process.exec('date -s "'+time+'"', (err, stdout, stderr) => {
		if (err || stderr){
			console.log('error setting time', err, stderr);
		} else {
			console.log('time set to:', stdout);
		}
	});
}

export function shutdown(){
	child_process.exec('shutdown -h now', (err, stdout, stderr) => console.log('shutting down', err, stdout, stderr) );
}

export async function board_detect(): Promise<any>{
	if(globals.local_dev)
		return 'unknown';
	return new Promise( (resolve, reject) => {
		child_process.exec('board_detect', (err, stdout, stderr) => {
			if (err) stdout = 'unknown';
			console.log('running on', stdout);
			resolve(stdout);
		});
	});
}

process.on('warning', e => console.warn(e.stack));
/*process.on('uncaughtException', err => {
	console.log('uncaught exception');
	throw err;
});
process.on('SIGTERM', () => {
	console.log('SIGTERM');
	throw new Error('SIGTERM');
});*/
