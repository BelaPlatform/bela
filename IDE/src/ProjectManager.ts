import * as file_manager from './FileManager';
import * as git_manager from './GitManager';
import * as project_settings from './ProjectSettings';
import * as util from './utils';
import * as paths from './paths';
import * as readChunk from 'read-chunk';
import * as fileType from 'file-type';
import * as DecompressZip from 'decompress-zip';
import * as fs from 'fs-extra-promise';
import * as socket_manager from './SocketManager';

let max_file_size = 52428800;	// bytes (50Mb)
let max_preview_size = 524288000;	// bytes (500Mb)

function emptyObject(obj: any) {
	Object.keys(obj).forEach(function(key) { delete obj[key]; });
}

// all ProjectManager methods are async functions called when websocket messages
// with the field event: 'project-event' is received. The function called is
// contained in the 'func' field. The websocket message is passed into the method
// as the data variable, and is modified and returned by the method, and sent
// back over the websocket
// NOTE: the current  way of handling project-event events is sub-optimal, at
// least for the following reasons:
// - it allows the client to execute arbitrary functions (security risk)
// - it does not rely on the functions to actively return something, instead
// it relies on the modifications they perform (or don't) to the data object to
// determine whether anything useful / interesting happened
// - future changes in the calling code in SocketManager.ts may inadvertently
// break any of these functions, in case it starts relying on other attributes
// (or their absence) in order to make some decisions. You can use
// emptyObject(data) to prevent the caller from doing anything
// - types and the presence of properties are unspecified and unenforced, and
// we blindly rely on the client to send a data object with the appropriate fields

// openFile takes a message with currentProject and newFile fields
// it opens the file from the project, if it is not too big or binary
// if the file is an image or audio file, it is symlinked from the media folder
export async function openFile(data: any){
  if (typeof data.newFile == 'undefined') {
    data.newFile = data.fileName;
  }
  if(null === data.newFile) {
    return;
  }
  let file_path = paths.projects+data.currentProject+'/'+data.newFile;
	try{
		var file_stat = await file_manager.stat_file(file_path);
	}
	catch(e){
		// if we are trying to open an example or template and we can't find the file, we are (probably)
		// trying to open a pd or supercollider project, so open _main* if it exists instead
		if (typeof data.exampleName !== 'undefined' || data.func === 'newProject'){
			for(let file of data.fileList){
				if (file.name.includes('_main')){
					data.newFile = file.name;
					await openFile(data);
					return;
				}
			}
		}
		data.error = 'Error opening file '+data.newFile+': file does not exist.';
		data.fileData = null;
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.readOnly = true;
		data.fileType = 0;
		return;
	}
	if (file_stat.size > max_preview_size){
		data.error = 'file is too large: '+(file_stat.size/1048576)+'Mb';
		data.fileData = "The IDE can't open files larger than "+(max_preview_size/1048576)+"Mb";
		data.readOnly = true;
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileType = 0;
		return;
	}
	let chunk: Buffer = await readChunk(file_path, 0, 4100);
	let file_type = await fileType(chunk);
	data.mtime = file_stat.mtime;
	if (file_type && (file_type.mime.includes('image') || file_type.mime.includes('audio'))){
		await file_manager.empty_directory(paths.media);
		await file_manager.make_symlink(file_path, paths.media+data.newFile);
		data.fileData = '';
		data.readOnly = true;
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileType = file_type.mime;
		return;
	}
	let is_binary = await file_manager.is_binary(file_path);
	if (is_binary){
		data.error = 'can\'t open binary files';
		data.fileData = 'Binary files can not be edited in the IDE';
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.readOnly = true;
		data.fileType = 0;
		return;
	}
	try{
		data.fileData = await file_manager.read_file(file_path);
	}
	catch(e){
		data.error = 'error opening file '+data.newFile+': '+e.toString();
		data.fileData = 'Error opening file. Please open a different file to continue';
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.readOnly = true;
		data.fileType = 0;
		return;
	}
	if (data.newFile.split && data.newFile.includes('.')){
		data.fileType = data.newFile.split('.').pop();
	} else {
		data.fileType = 0;
	}
	data.fileName = data.newFile;
	data.newFile = undefined;
	data.readOnly = false;
	socket_manager.broadcast('file-opened', {
		currentProject: data.currentProject,
		fileName: data.fileName,
		clientId: data.clientId,
	});
	return;
}

// these two methods are exceptions and don't take the data object
export async function listProjects(): Promise<string[]>{
	let projects = await file_manager.read_subfolders(paths.projects) as Array<string>;
	return projects;
}

export async function listLibraries(): Promise<any>{
	let libraries = [];
	let categories = await file_manager.read_directory(paths.libraries);
	for (let category of categories){
		if (await file_manager.directory_exists(paths.libraries+'/'+category)){
			libraries.push({
				name: category,
				children: await file_manager.read_directory(paths.libraries+'/'+category)
			});
		}
	}
	return libraries;
}

export async function listExamples(): Promise<any>{
	let examples = [];
	let categories = await file_manager.read_directory(paths.examples);
	for (let category of categories){
    let parsedChildren = [];
		if (await file_manager.directory_exists(paths.examples+'/'+category)){
      let children = await file_manager.read_directory(paths.examples+'/'+category);
      for (let child of children) {
        if (child.split('.').length < 2 || child.split('.').pop() === 'json') {
          parsedChildren.push(child);
        } else {
          console.log(child);
          console.log('^^ this is NOT a json file or folder ^^');
        }
      }
      examples.push({
        name: category,
        children: parsedChildren
      });
      parsedChildren = [];
		}
	}
	return examples;
}

// this only opens the project, but a notification needs to be emitted to the
// frontend to actually switch project
export async function openProject(data: any) {
	let projectRetryString: string = "Select a project from the projects menu, or create a new one.";
	if(!data.currentProject.trim()) {

		data.error = "No project is selected. "+projectRetryString;
		return;
	}
	let exists: boolean = await projectExists(data.currentProject);
	if(!exists) {
		data.error = "Project `"+data.currentProject+"' does not exist. "+projectRetryString;
		return;
	}
	data.fileList = await listFiles(data.currentProject);
	let settings: any = await project_settings.read(data.currentProject);
	data.newFile = settings.fileName;
	data.CLArgs = settings.CLArgs;
	if (data.currentProject !== 'exampleTempProject') data.exampleName = '';
	if (!data.gitData)
		data.gitData = {};
	data.gitData.currentProject = data.currentProject;
	await git_manager.info(data.gitData);
	await openFile(data);
}

export async function openExample(data: any){
	await file_manager.empty_directory(paths.exampleTempProject);
	await file_manager.copy_directory(paths.examples+data.currentProject, paths.exampleTempProject);
	data.exampleName = data.currentProject.split('/').pop();
	data.currentProject = 'exampleTempProject';
	await openProject(data);
}

export async function newProject(data: any){
	if(typeof(data.newProject) === "string")
	{
		data.newProject = data.newProject.trim();
	}
	if(!data.newProject) {
		data.error = 'failed, project name is empty.';
		return;
	}
	if (await file_manager.directory_exists(paths.projects+data.newProject)){
		data.error = 'failed, project '+data.newProject+' already exists!';
		return;
	}
	await file_manager.copy_directory(paths.templates+data.projectType, paths.projects+data.newProject);
	data.projectList = await listProjects();
	data.currentProject = data.newProject;
	data.newProject = undefined;
	await openProject(data);
}

export async function saveAs(data: any){
	if (await file_manager.directory_exists(paths.projects+data.newProject)){
		data.error = 'failed, project '+data.newProject+' already exists!';
		return;
	}
	await cleanProject(data);
	await file_manager.copy_directory(paths.projects+data.currentProject, paths.projects+data.newProject);
	data.projectList = await listProjects();
	data.currentProject = data.newProject;
	data.newProject = undefined;
	await openProject(data);
}

export async function deleteProject(data: any){
	await file_manager.delete_file(paths.projects+data.currentProject);
	data.projectList = await listProjects();
	for (let project of data.projectList){
		if (project && project !== 'undefined' && project !== 'exampleTempProject'){
			data.currentProject = project;
			await openProject(data);
			return;
		}
	}
	data.currentProject = '';
	data.readOnly = true;
	data.fileData = 'please create a new project to continue';
}

export async function cleanProject(data: any){
	await file_manager.empty_directory(paths.projects+data.currentProject+'/build');
	await file_manager.delete_file(paths.projects+data.currentProject+'/'+data.currentProject);
}

export async function newFile(data: any){
  let file_name = data.newFile.split('/').pop();
  let file_path;
  if (data.folder) {
    let folder = data.folder;
    file_path = paths.projects+data.currentProject + '/' + folder + '/' + file_name;
    data.newFile = folder + '/' + file_name;
  } else {
    file_path = paths.projects + data.currentProject + '/' + file_name;
    data.newFile = file_name;
  }
	if (await file_manager.file_exists(file_path)){
		data.error = 'failed, file '+ file_path +' already exists!';
		return;
	}
	file_manager.write_file(file_path, '/***** '+ file_name + ' *****/\n');
	data.fileList = await listFiles(data.currentProject);
	data.focus = {'line': 2, 'column': 1};
	await openFile(data);
}

export async function newFolder(data: any){
  console.log(data);
	let file_path = paths.projects + data.currentProject + '/' + data.newFolder;
	if (await file_manager.directory_exists(file_path)){
		data.error = 'failed, folder ' + data.newFolder + ' already exists!';
		return;
	}
  await file_manager.write_folder(file_path);
	data.fileList = await listFiles(data.currentProject);
}

export async function uploadFile(data: any){
	let file_path = paths.projects+data.currentProject+'/'+data.newFile;
	let file_exists = (await file_manager.file_exists(file_path) || await file_manager.directory_exists(file_path));
	if (file_exists && !data.force){
		data.error = 'failed, file '+data.newFile+' already exists!';
		data.fileData = undefined;
		return;
	}
	await file_manager.save_file(file_path, data.fileData);
	data.fileList = await listFiles(data.currentProject);
	await openFile(data);
}

export async function uploadZipProject(data: any){
	let tmp_path = paths.tmp + data.newFile;
	let tmp_target_path = tmp_path.replace(/\.zip$/, "/");
	let target_path = paths.projects + data.newProject;
	let file_exists = (await file_manager.file_exists(target_path) || await file_manager.directory_exists(target_path));
	if (file_exists && !data.force){
		data.error = 'Failed to create project '+data.newProject+': it already exists!';
		data.fileData = null;
		data.fileName = null;
		return;
	}
	await file_manager.save_file(tmp_path, data.fileData);
	let _cleanup = function (tmp_path: string, tmp_target_path: string) {
		//file_manager.delete_file(tmp_path);
		//file_manager.delete_file(tmp_target_path);
	}.bind(null, tmp_path, tmp_target_path);
	_cleanup();
	return new Promise<never> ((resolve, reject) => {
		let pathsToRemove = [ "__MACOSX", ".DS_Store" ];
		let unzipper = new DecompressZip(tmp_path);
		unzipper.on("extract", async (e: any) => {
			let fileList = await file_manager.deep_read_directory(tmp_target_path);
			//TODO: find root recursively as the first folder containing a file or more than one folder
			let isRoot = false;
			if(fileList.length > 1)
				isRoot = true;
			else {
				if(fileList[0] && fileList[0].size !== undefined)
					isRoot = true;
			}

			let source_path : string;
			if(isRoot) {
				source_path = tmp_target_path;
				console.log("Use as is: ", source_path);
			} else {
				// peel off the first folder
				source_path = tmp_target_path+fileList[0].name+"/";
				console.log("Strip off the top-level folder: ", source_path);
			}
			await file_manager.copy_directory(source_path, target_path);
			data.currentProject = data.newProject;
			await openProject(data);
			_cleanup();
			resolve();
		});
		unzipper.on("error", async (e: any) => {
			data.fileData = null;
			data.fileName = null;
			data.error = "Error extracting zip archive "+tmp_path+": "+e.message;
			_cleanup();
			resolve();
		})
		unzipper.extract({
			path: tmp_target_path,
			filter: function (file: any) {
				let matching : Array<string> = pathsToRemove.filter((needle) => {
					let path : string = file.path;
					let reg = RegExp("\\b"+needle+"\\b");
					return needle === file.filename || path.search(reg) != -1;
				})
				return 0 === matching.length;
			}
		});
	})
}

export async function cleanFile(project: string, file: string){
	if (file.split && file.includes('.')){
		let split_file = file.split('.');
		let ext = split_file.pop();
		let file_root = split_file.join('.');
		if (ext === 'cpp' || ext === 'c' || ext === 'S'){
			let file_path = paths.projects+project+'/build/'+file_root;
			await file_manager.delete_file(file_path+'.d');
			await file_manager.delete_file(file_path+'.o');
			await file_manager.delete_file(paths.projects + project + '/'+project);
		}
	}
}

export async function moveUploadedFile(data: any){
  await file_manager.rename_file(paths.uploads+data.newFile, paths.projects+data.currentProject+'/'+data.sanitisedNewFile);
  await cleanFile(data.currentProject, data.sanitisedNewFile);
  data.newFile = data.sanitisedNewFile;
  data.fileList = await listFiles(data.currentProject);
  await openFile(data);
}

export async function renameFile(data: any){
  let old_file_name = data.oldName;
  let file_name = data.oldName.split('/').pop();
  let file_path;
  if (data.folder) {
    let folder = data.folder + '/';
    file_path = paths.projects + data.currentProject + '/' + folder + file_name;
  } else {
    file_path = paths.projects + data.currentProject + '/' + file_name;
  }
  let new_file_path = file_path.replace(file_name, data.newFile);
	let file_exists = (await file_manager.file_exists(new_file_path) || await file_manager.directory_exists(file_path));
	if (file_exists){
		data.error = 'failed, file ' + data.newFile + ' already exists!';
		return;
	}
	await file_manager.rename_file(file_path, new_file_path);
	await cleanFile(data.currentProject, data.oldName);
  if (data.fileName == data.oldName) {
    data.fileName = data.newFile;
    await openFile(data);
  }
  data.fileList = await listFiles(data.currentProject);
}

export async function renameFolder(data: any){
	let folder_path = paths.projects + data.currentProject + "/" + data.oldName;
  let new_folder_path = paths.projects + data.currentProject + "/" + data.newFolder;
	let folder_exists = await file_manager.directory_exists(new_folder_path);
	if (folder_exists){
		data.error = 'failed, file ' + data.newFolder + ' already exists!';
		return;
	}
	await file_manager.rename_file(folder_path, new_folder_path);
	await cleanFile(data.currentProject, data.oldName);
	data.fileList = await listFiles(data.currentProject);
  let regex = RegExp(data.oldName);
  if (regex.test(data.fileName)) {
    data.fileName = data.fileName.replace(data.oldName, data.newFolder);
    await openFile(data);
  }
}

export async function deleteFile(data: any){
	await file_manager.delete_file(paths.projects+data.currentProject+'/'+data.fileName);
	await cleanFile(data.currentProject, data.fileName);
	data.fileList = await listFiles(data.currentProject);
  if (data.fileName == data.currentFile) {
    //TODO: ideally we would send a message to the frontend, but currently we
    //can only send "errors", and we don't want to
    data.fileData = null;
    data.fileName = null;
    data.readOnly = true;
  } else {
    data.fileName = data.currentFile;
  }
}

export async function listFiles(project: string): Promise<util.File_Descriptor[]>{
	return await file_manager.deep_read_directory(paths.projects+project);
}

export async function projectExists(project: string): Promise<boolean>{
	return await file_manager.directory_exists(paths.projects+project);
}
