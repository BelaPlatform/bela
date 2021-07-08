//// IDE controller
module.exports = {};

var Model = require('./Models/Model');
var popup = require('./popup');
var json = require('./site-text.json');
var utils = require('./utils.js');

// set up models
var models = {};
models.project = new Model();
models.settings = new Model();
models.status = new Model();
models.error = new Model();
models.git = new Model();

// hack to prevent first status update causing wrong notifications
models.status.setData({running: false, building: false});

// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', () => editorView.emit('resize') );

// settings view
var settingsView = new (require('./Views/SettingsView'))('settingsManager', [models.project, models.settings], models.settings);
settingsView.on('project-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	socket.emit('project-settings', data);
});

settingsView.on('IDE-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('IDE-settings', data);
	socket.emit('IDE-settings', data);
});
settingsView.on('run-on-boot', project => socket.emit('run-on-boot', project) );
settingsView.on('halt', () => {
	socket.emit('shutdown');
	consoleView.emit('warn', 'Shutting down...');
});
settingsView.on('warning', text => consoleView.emit('warn', text) );
settingsView.on('upload-update', data => socket.emit('upload-update', data) );
settingsView.on('error', text => consoleView.emit('warn', text) );

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project, models.settings]);
projectView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// file view
var fileView = new (require('./Views/FileView'))('fileManager', [models.project, models.settings]);
fileView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	if (!data.fileName && models.project.getKey('fileName')){
		data.fileName = models.project.getKey('fileName');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

fileView.on('force-rebuild', () => {
	socket.emit('process-event', {
		event			: 'rebuild',
		currentProject	: models.project.getKey('currentProject')
	});
});
fileView.on('file-rejected', filename => {
	var timestamp = performance.now();
	consoleView.emit('openNotification', {func: 'fileRejected', timestamp});
	consoleView.emit('closeNotification', {error: '... failed, file '+filename+' already exists. Refresh to allow overwriting', timestamp});
});

// editor view
var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings], models.settings);
editorView.on('upload', fileData => {
	socket.emit('process-event', {
		event			: 'upload',
		currentProject	: models.project.getKey('currentProject'),
		newFile			: models.project.getKey('fileName'),
		fileData,
		checkSyntax		: parseInt(models.settings.getKey('liveSyntaxChecking'))
	});
});
editorView.on('check-syntax', () => {
	if (parseInt(models.settings.getKey('liveSyntaxChecking'))){
		socket.emit('process-event', {
			event			: 'checkSyntax',
			currentProject	: models.project.getKey('currentProject'),
			newFile			: models.project.getKey('fileName')
		});
	}
});
editorView.on('open-notification', data => consoleView.emit('openNotification', data) );
editorView.on('close-notification', data => consoleView.emit('closeNotification', data) );
editorView.on('editor-changed', () => {
	if (models.project.getKey('exampleName')) projectView.emit('example-changed');
});
editorView.on('goto-docs', (word, id) => {
	if (tabView.getOpenTab() === 'tab-5' && word !== 'BelaContext'){
		documentationView.emit('open', id);
	} else {
		$('#iDocsLink')
			.addClass('iDocsVisible')
			.prop('title', 'cmd + h: '+word)
			.off('click').on('click', () => {
				tabView.emit('open-tab', 'tab-5');
				documentationView.emit('open', id);
			});
	}
});
editorView.on('clear-docs', () => $('#iDocsLink').removeClass('iDocsVisible').off('click') );
editorView.on('highlight-syntax', (names) => socket.emit('highlight-syntax', names) );
editorView.on('compare-files', compare => {
	compareFiles = compare;
	// unset the interval
	if (!compare) setModifiedTimeInterval(undefined);
});
editorView.on('console-brief', (text, id) => {
	consoleView.emit('openNotification', {
		func: 'editor',
		timestamp: id,
		text
	});
	setTimeout(function (id) {
		consoleView.emit('closeNotification', {timestamp: id, fulfillMessage: ''});
	}.bind(null, id), 500);
});

// toolbar view
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings]);
toolbarView.on('process-event', (event) => {
	var data = {
		event,
		currentProject	: models.project.getKey('currentProject')
	};
	//data.timestamp = performance.now();
	if (event === 'stop') consoleView.emit('openProcessNotification', json.ide_browser.stop);
	if (event === 'run' || event === 'stop')
		toolbarView.emit('msw-start-grace', event);
	socket.emit('process-event', data);
});
toolbarView.on('halt', () => {
	socket.emit('shutdown');
	consoleView.emit('warn', 'Shutting down...');
});
toolbarView.on('clear-console', () => consoleView.emit('clear', true) );
toolbarView.on('mode-switch-warning', num => consoleView.emit('warn', num + (num!=1?json.ide_browser.mode_switches:json.ide_browser.mode_switch) ) );

// console view
var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error, models.settings], models.settings);
consoleView.on('focus', (focus) =>  models.project.setKey('focus', focus) );
consoleView.on('open-file', (fileName, focus) => {
	var data = {
		func: 'openFile',
		fileName,
		focus,
		currentProject: models.project.getKey('currentProject')
	};
	socket.emit('project-event', data);
});
consoleView.on('input', value => socket.emit('sh-command', value) );
consoleView.on('tab', cmd => socket.emit('sh-tab', cmd) );

// documentation view
var documentationView = new (require('./Views/DocumentationView'));
documentationView.on('open-example', (example) => {
	if (projectView.exampleChanged){
		projectView.exampleChanged = false;
		popup.exampleChanged( () => {
			projectView.emit('message', 'project-event', {
				func: 'openExample',
				currentProject: example
			});
			$('.selectedExample').removeClass('selectedExample');
		}, undefined, 0, () => projectView.exampleChanged = true );
		return;
	}

	projectView.emit('message', 'project-event', {
		func: 'openExample',
		currentProject: example
	});
	$('.selectedExample').removeClass('selectedExample');
});
documentationView.on('add-link', (link, type) => {
	editorView.emit('add-link', link, type);
});

// git view
var gitView = new (require('./Views/GitView'))('git-manager', [models.git]);
gitView.on('git-event', data => {
	data.currentProject = models.project.getKey('currentProject');
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit('git-event', data);
});
gitView.on('console', text => consoleView.emit('log', text, 'git') );
gitView.on('console-warn', text => consoleView.emit('warn', text) );

// refresh file list
var listFilesIntervalMs = 5000;
var listFilesInterval = 0;

// setup socket
var _socket = io('/IDE');
// sub- minimal wrapper for socket.io to inject clientId
var socket = {
	on: (what, cb) => _socket.on(what, cb),
	io: _socket.io,
	emit: (what, data) => {
		socket.id = _socket.id;
		if("object" === typeof(data) && !Array.isArray(data))
			data.clientId = socket.id;
		_socket.emit(what, data);
	},
}

// socket events
socket.on('report-error', (error) => consoleView.emit('warn', error.message || error) );

socket.on('init', (data) => {

	consoleView.connect();

	var timestamp = performance.now()
	socket.emit('project-event', {func: 'openProject', currentProject: data.settings.project, timestamp})
	consoleView.emit('openNotification', {func: 'init', timestamp});

	models.project.setData({projectList: data.projects, exampleList: data.examples, libraryList: data.libraries,  currentProject: data.settings.project});
	models.settings.setData(data.settings);

	$('[data-run-on-boot]').val(data.boot_project);

	models.settings.setKey('belaCoreVersion', data.bela_core_version);
	models.settings.setKey('belaImageVersion', data.bela_image_version);
	models.settings.setKey('xenomaiVersion', data.xenomai_version);

	console.log('running on', data.board_string);
	models.settings.setKey('boardString', data.board_string);
	tabView.emit('boardString', data.board_string);

	clearInterval(listFilesInterval);
	listFilesInterval = setInterval( () => {
		var currentProject = models.project.getKey('currentProject');
		if(currentProject) {
			socket.emit('list-files', currentProject);
		}
	}, listFilesIntervalMs);

	// TODO! models.status.setData(data[5]);

	//models.project.print();
	//models.settings.print();

	socket.emit('set-time', new Date().toString());

	documentationView.emit('init');

	// hack to stop changes to read-only example being overwritten when opening a new tab
	if (data.settings.project === 'exampleTempProject') models.project.once('set', () => projectView.emit('example-changed') );

	// socket.io timeout
	socket.io.engine.pingTimeout = 6000;
	socket.io.engine.pingInterval = 3000;

});

// project events
socket.on('project-data', (data) => {

	// if the file gets to us, it's because we requested it,
	// so we are going to use it regardless of the current state
	models.project.setKey('openElsewhere', false);
	consoleView.emit('closeNotification', data);
	models.project.setData(data);

	if (data.gitData) models.git.setData(data.gitData);
	setModifiedTimeInterval(data.mtime);
	//console.log(data);
	//models.settings.setData(data.settings);
	//models.project.print();
});
socket.on('stop-reply', (data) => {
	consoleView.emit('closeNotification', data);
});
socket.on('project-list', (project, list) =>  {
	if (project && list.indexOf(models.project.getKey('currentProject')) === -1){
		// this project has just been deleted
		socket.emit('project-event', {func: 'openProject', currentProject: project});
	}
	models.project.setKey('projectList', list);
});
socket.on('file-list', (project, list) => {
	if (project && project === models.project.getKey('currentProject')){
		models.project.setKey('fileList', list);
	}
});

socket.on('status', (status, project) => {
	if (project === models.project.getKey('currentProject') || project === undefined){
		models.status.setData(status);
		//console.log('status', status);
	}
});

socket.on('project-settings-data', (project, settings) => {
	// console.log('project-settings-data', settings);
	if (project === models.project.getKey('currentProject'))
		models.project.setData(settings);
});
socket.on('IDE-settings-data', (settings) => models.settings.setData(settings) );

socket.on('cpu-usage', data => models.status.setKey('CPU', data) );
//socket.on('mode-switch', data => models.status.setKey('msw', data) );

socket.on('disconnect', (reason) => {
	console.log('disconnect reason:', reason);
	clearInterval(listFilesInterval);
	consoleView.disconnect();
	toolbarView.emit('disconnected');
	models.project.setKey('readOnly', true);
});

socket.on('file-opened', (data) => {
	fileOpenedOrChanged(data, 0);
})

socket.on('file-changed', (data) => {
	fileOpenedOrChanged(data, 1);
})

function fileOpenedOrChanged(data, changed) {
	let str = changed ? 'changed' : 'opened';
	let project = data.currentProject;
	let fileName = data.fileName;
	let clientId = data.clientId;
	// if someone else opened or changed our file
	// and we arenot ignoring it
	if (project === models.project.getKey('currentProject')
			&& fileName === models.project.getKey('fileName')
			&& clientId != socket.id
			&& !models.project.getKey('openElsewhere')
			&& !models.project.getKey('readOnly')
	) {
		if(changed)
			fileChangedPopup(fileName);
		else
			enterReadonlyPopup(fileName);
	}
}

// run-on-boot
socket.on('run-on-boot-log', text => consoleView.emit('log', text) );
//socket.on('run-on-boot-project', project => setTimeout( () => $('#runOnBoot').val(project), 100) );

// shell
socket.on('shell-event', (evt, data) => consoleView.emit('shell-'+evt, data) )

// generic log and warn
socket.on('std-log', text => consoleView.emit('log', text) );
socket.on('std-warn', text => consoleView.emit('warn', text) );

socket.on('syntax-highlighted', () => editorView.emit('syntax-highlighted') );

socket.on('force-reload', () => setTimeout( () => window.location.reload(true), 1000));
socket.on('update-error', err => {
	popup.overlay();
	consoleView.emit('warn', utils.formatString(json.console.update_error, err));
});

socket.on('mtime', setModifiedTimeInterval);
socket.on('mtime-compare', data => {
	if (compareFiles && data.currentProject === models.project.getKey('currentProject') && data.fileName === models.project.getKey('fileName')){
		// console.log(data, data.fileData, editorView.getData());
		if (data.fileData !== editorView.getData())
			fileChangedPopup(data.fileName);
	}
});

var checkModifiedTimeInterval;
var compareFiles = false;
function setModifiedTimeInterval(mtime){
	// console.log('received mtime', mtime);
	if (checkModifiedTimeInterval) clearInterval(checkModifiedTimeInterval);
	if (!mtime || !compareFiles) return;
	checkModifiedTimeInterval = setInterval(() => {
		// console.log('sent compare-mtime', mtime);
		socket.emit('compare-mtime', {
			currentProject	:	models.project.getKey('currentProject'),
			fileName		:	models.project.getKey('fileName'),
			mtime
		});
	}, 5000);
}

// current file changed
var fileChangedPopupVisible = false;
function fileChangedPopup(fileName){
	if (fileChangedPopupVisible) return;

	var strings = Object.assign({}, json.popups.file_changed); // make a copy ...
	strings.text = fileName + strings.text; // ... so we can modify it
	popup.twoButtons(strings,
		e => {
			fileChangedPopupVisible = false;
			e.preventDefault();
			var data = {
				func			: 'openProject',
				currentProject	: models.project.getKey('currentProject'),
				timestamp		: performance.now()
			};
			socket.emit('project-event', data);
			consoleView.emit('openNotification', data);
		},
		() => {
			fileChangedPopupVisible = false;
			editorView.emit('upload', editorView.getData());
		}
	);
	fileChangedPopupVisible = true;
}

function enterReadonlyPopup(fileName) {
	if(fileChangedPopupVisible) return; //	 changed file takes priority
	var strings = {};
	strings.title = json.popups.enter_readonly.title;
	strings.text = json.popups.enter_readonly.text;
	strings.button = json.popups.enter_readonly.button;
	strings.cancel = json.popups.enter_readonly.cancel;

	// Click the OK button to put page in read-only
	popup.oneButton(strings,
		() => {
			models.project.setKey('openElsewhere', true);
			setReadOnlyStatus(true);
		}
	);
}

function setReadOnlyStatus(status) {
	if (status) {
		$('div.read-only').addClass('active');
		$('div.read-only').click(() => exitReadonlyPopup());
	} else {
		$('div.read-only').removeClass('active');
	}
}


function exitReadonlyPopup() {
	var strings = {};
	strings.title = json.popups.exit_readonly.title;
	strings.code = '<p>' + json.popups.exit_readonly.text[0] + '</p><p>' + json.popups.exit_readonly.text[1] + '</p>';
	strings.cancel = json.popups.exit_readonly.cancel;
	strings.button = json.popups.exit_readonly.submit;
	popup.twoButtons(strings,
		// on Submit:
		e => {
			setReadOnlyStatus(false);
			window.location.reload();
		},
		// on Cancel:
		() => {
			popup.hide();
		}
	);
}

// model events
// build errors
models.status.on('set', (data, changedKeys) => {
	if (changedKeys.indexOf('syntaxError') !== -1){
		parseErrors(data.syntaxError);
	}
});

// top-bar
models.project.on('change', (data, changedKeys) => {

	var projectName = data.exampleName ? data.exampleName+' (example)' : data.currentProject;
	// set the browser tab title
	$('[data-title]').html((data.fileName ? data.fileName+', ' : '') + projectName);
	// set the top-line stuff
	$('[data-current-project]').html(projectName ? projectName : '');
	$('[data-current-file]').html(data.fileName ?  data.fileName : '');

	if (data.exampleName){
		$('#top-example-docs').css('visibility', 'visible');
		$('#top-example-docs-link').prop('href', 'documentation/'+data.exampleName+'_2render_8cpp-example.html');
	} else {
		$('#top-example-docs').css('visibility', 'hidden');
	}
});

// status changes reflected here
models.status.on('change', (data, changedKeys) => {
	if (changedKeys.indexOf('running') !== -1 || changedKeys.indexOf('building') !== -1){
		if (data.running) {
			$('[data-current-status-title]').html('Running: ');
			$('[data-current-status]').html(data.runProject);
		} else if (data.building) {
			$('[data-current-status-title]').html('Building: ');
			$('[data-current-status]').html(data.buildProject);
		} else {
			$('[data-current-status]').html('');
			$('[data-current-status-title]').html('');
		}
	}
});

// history
{
	let lastState = {}, poppingState = true;

	// file / project changed
	models.project.on('change', (data, changedKeys) => {
		if (changedKeys.indexOf('currentProject') !== -1 || changedKeys.indexOf('fileName') !== -1){
			var state = {file: data.fileName, project: data.currentProject};
			if (state.project !== lastState.project || state.file !== lastState.file){

				if (!poppingState){
					//console.log('push', state);
					history.pushState(state, null, null);
				}
				poppingState = false
				lastState = state;
			}
		}
	});

	// load previously open file / project when browser's back button is clicked
	window.addEventListener('popstate', function(e) {
		if (e.state){
			console.log('opening project '+e.state.project+' file '+e.state.file);
			var data = {
				currentProject	: e.state.project,
				newFile 		: e.state.file,
				func			: 'openProject',
				timestamp 		: performance.now()
			};
			consoleView.emit('openNotification', data);
			socket.emit('project-event', data);
			poppingState = true;
		}
	});
}

// local functions
// parse errors from g++
function parseErrors(data){
//console.log('parsing', data, data.split('\n'));
	data = data.split('\n');

	var errors = [];
	for (let i=0; i<data.length; i++){

		// ignore errors which begin with 'make'
		if (data[i].length > 1 && data[i].slice(0,4) !== 'make'){

			var msg = data[i].split('\n');

			for (let j=0; j<msg.length; j++){

				var str = msg[j].split(':');
				// console.log(str);
				// str[0] -> file name + path
				// str[1] -> row number
				// str[2] -> column number
				// str[3] -> type of error
				// str[4+] > error message

				if (str[3] === ' error'){
					errors.push({
						file: str[0],
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' fatal error'){
					errors.push({
						file: str[0],
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' warning'){
					errors.push({
						file: str[0],
						row: str[1]-1,
						column: str[2],
						text: '[warning] '+str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "warning"
					});
				} else if (str[0] == 'pasm'){
					errors.push({
						file: str[1].split(' ')[1].split('(')[0],
						row: parseInt(str[1].split(' ')[1].split('(')[1].split(')')[0])-1,
						column: '',
						text: '[pasm] '+str[2].substring(1),
						type: "error"
					});
				} else {
					//console.log('rejected error string: '+str);
					if (str[2] && str[2].indexOf('linker') !== -1){
						console.log('linker error');
						// consoleView.emit('warn', 'linker error detected, set verbose build output in settings for details');
					}
				}
			}
		}
	}

	// if no gcc errors have been parsed correctly, but make still thinks there is an error
	// error will contain string 'make: *** [<path>] Error 1'
	if (!errors.length && (data.indexOf('make: *** ') !== -1) && (data.indexOf('Error 1') !== -1)){
		errors.push({
			text: data,
			type: 'error'
		});
	}

	var currentFileErrors = [], otherFileErrors = [];
	for (let err of errors){
		var file;
		if(err.file) {
			file = err.file.split("projects/");
			if(file.length >= 2) {
				// remove the project name
				file = file[1].split("/");
				file.splice(0, 1);
				file = file.join("/");
			}
		}
		if (!err.file || file === models.project.getKey('fileName')){
			err.currentFile = true;
			currentFileErrors.push(err);
		} else {
			err.currentFile = false;
			err.text = 'In file '+file+': '+err.text;
			otherFileErrors.push(err);
		}
	}

	models.error.setKey('allErrors', errors);
	models.error.setKey('currentFileErrors', currentFileErrors);
	models.error.setKey('otherFileErrors', otherFileErrors);

	models.error.setKey('verboseSyntaxError', data);

}

// hotkeys
var keypress = new window.keypress.Listener();

keypress.simple_combo("meta s", function(){ toolbarView.emit('process-event', 'run') });
keypress.simple_combo("meta f", function(){ editorView.emit('search') });
keypress.simple_combo("meta o", function(){ tabView.emit('toggle', 'click', 'tab-control') });
keypress.simple_combo("meta k", function(){ consoleView.emit('clear', true) });
keypress.simple_combo("meta h", function(){ $('#iDocsLink').trigger('click') });
