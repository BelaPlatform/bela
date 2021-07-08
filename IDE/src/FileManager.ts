import * as fs from 'fs-extra-promise';
import * as child_process from 'child_process';
import * as isBinary from 'isbinaryfile';
import * as util from './utils';
import { Lock } from "./Lock";
import { MostRecentQueue } from './MostRecentQueue';
import * as globals from './globals';

// FileManager is only available as a single instance accross the app, exported as fm
// it has a private Lock which is always acquired before manipulating the filesystem
// thus concurent access is prohibited
// only the primitive file and directory manipulation methods should touch the lock
// OR the filesystem, in the whole app

const lock: Lock = new Lock("FileManager");
const commitLock: Lock = new Lock("CommitLock");
let queuedCommits : MostRecentQueue = new MostRecentQueue;

// wait at least commitShortTimeoutMs after a file change before committing to disk
const commitShortTimeoutMs = 500;
// but do commit at least every commitLongTimeoutMs
const commitLongTimeoutMs = 2000;
let commitShortTimeout : NodeJS.Timer;
let commitLongTimeout : NodeJS.Timer;
let commitLongTimeoutScheduled : boolean = false;

async function commitPathNow(path: string)
{
	let fd = await fs.openAsync(path, 'r');
	await fs.fsyncAsync(fd);
	await fs.closeAsync(fd);
}

async function processCommits(short : boolean) {
	// Regardless of how we got here, we are going to process all outstanding commits.
	// Clear all timers before waiting on the lock, so they do not expire while we are running,
	// as they would anyhow have to wait for the lock, and ultimately be left with no job to do
	clearTimeout(commitShortTimeout);
	clearTimeout(commitLongTimeout);
	await commitLock.acquire();
	while(queuedCommits.size) {
		for(let path of queuedCommits.keys()) {
			try {
				queuedCommits.pop(path);
				await commitPathNow(path);
			} catch (e) {
				if(globals.verbose)
					console.log("File to be committed", path, "no longer exists");
			}
		}
	}
	// clear the flag once we are done, so that the LongTimeout can be scheduled again
	commitLongTimeoutScheduled = false;
	commitLock.release();
}

async function commit(path: string, now: boolean = false)
{
	if(now) {
		await commitPathNow(path);
	} else {
		queuedCommits.push(path);
		// if the lock is busy, anything we just pushed will be processed soon
		if(!commitLock.acquired) {
			// otherwise schedule processing
			clearTimeout(commitShortTimeout);
			commitShortTimeout = global.setTimeout(processCommits.bind(null, true), commitShortTimeoutMs);
			if(!commitLongTimeoutScheduled) {
				commitLongTimeoutScheduled = true;
				clearTimeout(commitLongTimeout);
				commitLongTimeout = global.setTimeout(processCommits.bind(null, false), commitLongTimeoutMs);
			}
		}
	}
}

async function commit_folder(path: string)
{
	await commit(path);
	let list = await deep_read_directory(path);
	for(let file_path of list)
		await commit(path+"/"+file_path.name);
}
// primitive file and directory manipulation
export async function write_file(file_path: string, data: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.outputFileAsync(file_path, data);
		await commit(file_path);
	}
	finally{
		lock.release();
	}
}
export async function write_folder(file_path: string): Promise<void>{
	if(globals.verbose)
		console.log("write_folder :", file_path);
	await lock.acquire();
	try{
		await fs.mkdirSync(file_path);
		await commit(file_path);
	}
	finally{
		lock.release();
	}
}
export async function read_file(file_path: string): Promise<string> {
	await lock.acquire();
	let out: string;
	try{
		out = await fs.readFileAsync(file_path, 'utf8');
	}
	finally{
		lock.release();
	}
	return out;
}
export async function read_file_raw(file_path: string): Promise<Buffer>{
	await lock.acquire();
	let out: Buffer;
	try{
		out = await fs.readFileAsync(file_path);
	}
	finally{
		lock.release();
	}
	return out;
}
export async function rename_file(src: string, dest: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.moveAsync(src, dest, {overwrite: true});
		await commit(dest);
	}
	finally{
		lock.release();
	}
}
export async function delete_file(file_path: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.removeAsync(file_path);
	}
	finally{
		lock.release();
	}
}
export async function read_subfolders(dir_path: string) {
	await lock.acquire();
	return new Promise( (resolve, reject) => {
		child_process.exec('find . -type d -maxdepth 1', { cwd: dir_path }, (error : Error, stdout : string, stderr : string) => {
			lock.release();
			if (error) {
				console.error(`exec error: ${error}`);
				reject(error);
			}
			let files : string = stdout.replace(/\.\//mg, '');
			files = files.replace(/^\.\n/gm, ''); // remove the . folder
			files = files.replace(/\n$/g, ''); // remove trailing newline to avoid empty element when splitting
			let projects : Array<string> = files.split('\n').sort();
			resolve(projects);
		});
	});
}
export async function read_directory(dir_path: string): Promise<string[]>{
	await lock.acquire();
	let out: string[];
	try{
		out = await fs.readdirAsync(dir_path);
		out.sort(function(a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		});
	} catch (e) { }
	finally{
		lock.release();
	}
	return out;
}
export async function stat_file(file_name: string): Promise<fs.Stats>{
	await lock.acquire();
	let out: any;
	try{
		out = await fs.lstatAsync(file_name);
	}
	finally{
		lock.release();
	}
	return out;
}
export async function copy_directory(src_path: string, dest_path: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.copyAsync(src_path, dest_path);
	}
	finally{
		lock.release();
	}
	// TODO: this would normally be in the finally(), however it cannot be
	// within lock-guarded section because (for unclear reasons) read_directory
	// (whcih is called under the hood by commit_folder() ) also needs the lock.
	await commit_folder(dest_path);
}
export async function copy_file(src_path: string, dest_path: string): Promise<void>{
	return copy_directory(src_path, dest_path);
}
// for some reason fs does not have ensureSymLinkAsync or emptyDirAsync
// so promisify them manually
export async function make_symlink(src_path: string, dest_path: string): Promise<any>{
	await lock.acquire();
	return new Promise( (resolve, reject) => {
		fs.ensureSymlink(src_path, dest_path, err => {
			lock.release();
			if (err) reject(err);
			resolve();
		});
	});
}
export async function empty_directory(dir_path: string): Promise<any>{
	await lock.acquire();
	return new Promise( (resolve, reject) => {
		fs.emptyDir(dir_path, err => {
			lock.release();
			if (err) reject(err);
			resolve();
		});
	});
}
// sophisticated file and directory manipulation
export {save_file as save_file} from './SaveFile';

// recursively read the contents of a directory, returning an array of File_Descriptors
export async function deep_read_directory(dir_path: string): Promise<util.File_Descriptor[]>{
	let contents: any = await read_directory(dir_path);
	let output: util.File_Descriptor[] = [];
	for (let name of contents){
		const original_path = dir_path+'/'+name;
		let path = original_path;
		let stat = await stat_file(path);
		// follow symlinks (with a maximum limit)
		const maxLevels = 100;
		let levels = 0;
		while(stat.isSymbolicLink()) {
			path = await fs.readlinkAsync(path);
			if('/' != path[0])
				path = dir_path+'/'+path;
			stat = await stat_file(path);
			++levels;
			if(maxLevels <= levels) {
				break;
			}
		}
		if(maxLevels <= levels) {
			console.error('Unable to properly stat %s: too many symlinks to follow(%d)', original_path, levels);
			path = original_path;
		}
		let desc: util.File_Descriptor = new util.File_Descriptor(name);
		if (stat.isDirectory())
			desc.children = await deep_read_directory(path);
		else
			desc.size = stat.size;
		output.push(desc);
	}
	return output;
}

// checks if a file is binary - only reads a few thousand bytes at most
// returns a boolean when awaited
export async function is_binary(file_path: string){
	await lock.acquire();
	return new Promise( (resolve, reject) => {
		isBinary(file_path, (err: any, result: any) => {
			lock.release();
			if (err) reject(err);
			resolve(result);
		});
	});
}
export async function read_json(file_path: string): Promise<any> {
	let output: string = await read_file(file_path);
	return JSON.parse(output);
}
export async function write_json(file_path: string, data: any): Promise<void> {
	return write_file(file_path, JSON.stringify(data, null, 2) + '\n');
}
export async function directory_exists(dir_path: string): Promise<boolean>{
	// the "/" ensure return stat.isDirectory() is "true" for symlinks to directories
	let stat: any = await stat_file(dir_path+"/")
		.catch( e => {} );
	return (stat && stat.isDirectory && stat.isDirectory()) ? true : false;
}
export async function file_exists(file_path: string): Promise<boolean>{
	let stat: any = await stat_file(file_path)
		.catch( e => {} );
	return (stat && stat.isFile && stat.isFile()) ? true : false;
}
export async function delete_matching_recursive(path: string, matches: Array<string>) {
	// maybe `find path -name=i$match -exec rm {}\;` could be faster?
	let all: any = await read_directory(path);
	let contents: Array<string> = await read_directory(path);
	let matching: Array<string> = contents.filter((file) => {
		let matching = matches.filter((match) => { return match === file; });
		return matching.length > 0;
	});
	let updated: boolean = false;
	for(let match of matching) {
		let full_path = path+'/'+match;
		await delete_file(full_path);
		updated = true;
	}
	// re-read once updated
	if(updated)
		contents = await read_directory(path);
	for(let file of contents) {
		let full_path = path+'/'+file;
		let stat = await stat_file(full_path);
		if(stat.isDirectory()) {
			delete_matching_recursive(full_path, matches);
		}
	}
}
