var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');

var sourceIndeces = ['cpp', 'c', 's'];
var headerIndeces = ['h', 'hh', 'hpp'];
var imageIndeces = ['jpg', 'jpeg', 'png', 'gif'];
var absIndeces = ['pd'];

var askForOverwrite = true;
var uploadingFile = false;
var overwriteAction = '';
var fileQueue = [];
var forceRebuild = false;
var viewHiddenFiles = false;
var firstViewHiddenFiles = true;

var listCount = 0;

function isDragEvent(e, type)
{
	return e.originalEvent.dataTransfer.types.includes(type);
}
class FileView extends View {

	constructor(className, models){
		super(className, models);

		this.listOfFiles = [];

    var data = {
      fileName: "",
      project: ""
    };

		var overlayActiveClass = 'active-drag-upload';
		// drag and drop file upload on editor
		var overlay = $('[data-overlay]');
		overlay.on('dragleave', (e) => {
			overlay.removeClass(overlayActiveClass);
		});
		$('body').on('dragenter dragover drop', (e) => {
			if(!isDragEvent(e, "Files"))
				return;
			e.stopPropagation();
			e.preventDefault();
      if (e.type == 'dragenter') {
        overlay.addClass(overlayActiveClass);
      }
			if (e.type === 'drop'){
				for (var i = 0; i < e.originalEvent.dataTransfer.files.length; i++){
          // console.log(e.originalEvent.dataTransfer.files[i].size);
          // 20mb maximum drag and drop file size
          if (e.originalEvent.dataTransfer.files[i].size >= 20000000) {
            let that = this;
            overlay.addClass('no');
            setTimeout(function(){
              overlay.removeClass('no')
                     .removeClass(overlayActiveClass);
              that.uploadSizeError();
            }, 1500);
            return false;
          } else {
            this.doFileUpload(e.originalEvent.dataTransfer.files[i]);
          }
          if (i == e.originalEvent.dataTransfer.files.length - 1) {
            setTimeout(function(){
              overlay.removeClass(overlayActiveClass)
                     .removeClass('no');
            }, 1500);
          }
				}
			}
			return false;
		});

	}

	// UI events
	buttonClicked($element){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}

	newFile(func, base){
		popup.title(json.popups.create_new_file.title);
		popup.subtitle(json.popups.create_new_file.text);
		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.create_new_file.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.create_new_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
      if (!base) {
        this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
      } else {
        this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val()), folder: base});
      }
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

  newFolder(func){
		// build the popup content
		popup.title(json.popups.create_new_folder.title);
		popup.subtitle(json.popups.create_new_folder.text);

		var form = [];
    form.push('<input type="hidden"></input>');
		form.push('<input type="text" placeholder="' + json.popups.create_new_folder.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.create_new_folder.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newFolder: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

  uploadSizeError(){
    // build the popup content
    popup.title("Error: File is too large")
         .addClass("error");
    popup.subtitle("The maximum size for uploading files via drag and drop interface is 20MB. Please click 'try again' to select a file from your computer.");

    var form = [];
    form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + "Try Again" + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');
    popup.form.append(form.join('')).off('submit').on('submit', e => {
      e.preventDefault();
      popup.hide();
      this.uploadFile();
    });
	popup.find('.cancel').on('click', popup.hide );
    popup.show();
  }

  uploadFileError(){
    // build the popup content
    popup.title("Error: No file selected for upload")
         .addClass("error");
    popup.subtitle("No file was selected for upload");

    var form = [];
    form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + "Try Again" + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');
    popup.form.append(form.join('')).off('submit').on('submit', e => {
      e.preventDefault();
      popup.hide();
      this.uploadFile();
    });
	popup.find('.cancel').on('click', popup.hide );
    popup.show();
  }

	uploadFile(func){
    // build the popup content
		popup.title(json.popups.upload_file.title);
		popup.subtitle(json.popups.upload_file.text);

		var form = [];
    $('[data-popup] form').attr('action', '/uploads')
                          .attr('enctype','multipart/form-data')
                          .attr('method', 'POST');
    form.push('<input type="file" name="data" data-form-file></input>');
		form.push('</br >');
    form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.upload_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
      var file = $('[data-form-file]')[0];
      var location = '/projects/basic';
      var formEl = $('[data-popup] form')[0];
      var formData = new FormData(formEl);
      var popupBlock = $('[data-popup-nointeraction]');
      if (file.value.length > 0) {
        popupBlock.addClass('active');
        $('body').addClass('uploading');
        popupBlock.addClass('active');
        popup.find('.confirm')
             .attr('disabled', true);
        this.doLargeFileUpload(formData, file, location);
      } else {
        popup.hide();
        this.uploadFileError();
      }
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

	renameFile(e){
		// Get the name of the file to be renamed:
		var name = $(e.target).data('name');
    var func = $(e.target).data('func');
    var folder = $(e.target).data('folder');
		// build the popup content
		popup.title('Rename ' + name + '?');
		popup.subtitle(json.popups.rename_file.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.rename_file.input + '" value="' + name + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.rename_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			var newName = sanitise(popup.find('input[type=text]').val());
			this.emit('message', 'project-event', {func: 'renameFile', folderName: folder, oldName: name, newFile: newName});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

  renameFolder(e){
    // Get the name of the file to be renamed:
		var name = $(e.target).data('name');
    var func = $(e.target).data('func');
		// build the popup content
		popup.title('Rename ' + name + '?');
		popup.subtitle(json.popups.rename_folder.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.rename_folder.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.rename_folder.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			var newName = sanitise(popup.find('input[type=text]').val());
			this.emit('message', 'project-event', {func: 'renameFolder', oldName: name, newFolder: newName});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

  }

	deleteFile(e){
		// Get the name of the file to be deleted:
		var name = $(e.target).data('name');
    var func = $(e.target).data('func');
		// build the popup content
		popup.title('Delete ' + name + '?');
		popup.subtitle(json.popups.delete_file.text);

		var form = [];
		form.push('<button type="submit" class="button popup delete">' + json.popups.delete_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func: 'deleteFile', fileName: name, currentFile: $('[data-current-file]')[0].innerText});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

		popup.find('.delete').trigger('focus');

	}

	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', newFile: $(e.currentTarget).data('file')})
	}

	// model events
	_fileList(files, data){

		if (!Array.isArray(files)) return;

		this.listOfFiles = files;

		var $files = $('[data-file-list]')
		$files.empty();

		var headers = [];
		var sources = [];
    var abstractions = [];
		var resources = [];
		var directories = [];
		var images = [];
		for (let item of files){

			// exclude hidden files

			if (!viewHiddenFiles && (item.name[0] === '.' || (isDir(item) && item.name === 'build') || item.name === 'settings.json' || item.name == data.currentProject)) {
				continue;
			}

			if (isDir(item)){

				directories.push(item);

			} else {

				let ext = item.name.split('.').pop();

				if (item.size < 1000000){
					item.size = (item.size/1000).toFixed(1) + 'kb';
				} else if (item.size >= 1000000 && item.size < 1000000000){
					item.size = (item.size/1000000).toFixed(1) + 'mb';
				}

				if (sourceIndeces.indexOf(ext) !== -1){
					sources.push(item);
				} else if (headerIndeces.indexOf(ext) !== -1){
					headers.push(item);
				} else if (imageIndeces.indexOf(ext.toLowerCase()) !== -1) {
					images.push(item);
				} else if (ext == "pd" && item.name == "_main.pd") {
					sources.push(item);
				} else if (ext == "pd") {
          abstractions.push(item);
        } else if (item){
					resources.push(item);
				}

			}

		}

		var pd = '_main.pd';
		var render = 'render.cpp';
		headers.sort( (a, b) => a.name - b.name );
		sources.sort( (a, b) => a.name - b.name );
		sources.sort( (a, b) => a.name == pd ? -1 : b.name == pd ? 1 : 0 );
		sources.sort( (a, b) => a.name == render ? -1 : b.name == render ? 1 : 0 );
    abstractions.sort( (a, b) => a.name - b.name );
    images.sort( (a, b) => a.name - b.name );
		resources.sort( (a, b) => a.name - b.name );
		directories.sort( (a, b) => a.name - b.name );

		var file_list_elements = [ sources, headers, abstractions, images, resources, directories ];
        file_list_elements[0].name = json.file_view.sources;
        file_list_elements[1].name = json.file_view.headers;
        file_list_elements[2].name = json.file_view.abstractions;
        file_list_elements[3].name = json.file_view.images;
        file_list_elements[4].name = json.file_view.resources;
        file_list_elements[5].name = json.file_view.directories;
    var i18n_dir_str = json.file_view.directories;

		// Build file structure by listing the contents of each section (if they exist)

		for (let i = 0; i < file_list_elements.length; i++) {

			if (file_list_elements[i].length) {

				var section = $('<div></div>')
            .addClass('section');
				$('<p></p>')
            .addClass('file-heading')
            .html(file_list_elements[i].name)
            .appendTo(section);
            // console.log('current sec: ' + file_list_elements[i].name);
				var fileList = $('<ul></ul>')
            .addClass('sub-file-list');

				for (let j = 0; j < file_list_elements[i].length; j++) {
	        var listItem = $('<li></li>')
                .addClass('source-file')
                .appendTo(fileList);
          var item = file_list_elements[i][j];
	        // var itemData = $('<div></div>').addClass('source-data-container').appendTo(listItem);
          if (file_list_elements[i].name != i18n_dir_str) {
            var itemText = $('<div></div>')
                  .addClass('source-text')
                  .html(item.name + ' <span class="file-list-size">' + item.size + '</span>')
                  .data('file', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.openFile(e));
            var renameButton = $('<button></button>')
                  .addClass('file-rename file-button fileManager')
                  .attr('title', 'Rename')
                  .attr('data-func', 'renameFile')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.renameFile(e));
  	        var downloadButton = $('<button></button>')
                  .addClass('file-download file-button fileManager')
                  .attr('href-stem', '/download?project=' + data.currentProject + '&file=')
                  .attr('data_name', item.name)
                  .appendTo(listItem)
                  .on('click', (e, projName) => this.downloadFile(e, data.currentProject));
            var deleteButton = $('<button></button>')
                  .addClass('file-delete file-button fileManager')
                  .attr('title', 'Delete')
                  .attr('data-func', 'deleteFile')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.deleteFile(e));
          } else {
            section.addClass('is-dir');
            var itemText = $('<div></div>')
                  .addClass('source-text')
                  .text(item.name)
                  .data('file', item.name)
                  .appendTo(listItem);
            var renameButton = $('<button></button>')
                  .addClass('file-rename file-button fileManager')
                  .attr('title', 'Rename')
                  .attr('data-func', 'renameFolder')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.renameFolder(e));
            var newButton = $('<button></button>')
                  .addClass('file-new file-button fileManager')
                  .attr('title', 'New File')
                  .attr('data-func', 'newFile')
                  .attr('data-folder', item.name)
                  .appendTo(listItem)
                  .on('click', () => this.newFile('newFile', event.target.dataset.folder));
            var deleteButton = $('<button></button>')
                  .addClass('file-delete file-button fileManager')
                  .attr('title', 'Delete')
                  .attr('data-func', 'deleteFile')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.deleteFile(e));
            var subList = $('<ul></ul>');
            for (var k = 0; k < item.children.length; k++) {
              var child = item.children[k];
              var subListItem = $('<li></li>')
                    .addClass('source-text')
                    .text(child.name)
                    .data('file', item.name + "/" + child.name)
                    .on('click', (e) => this.openFile(e));
              var deleteButton = $('<button></button>')
                    .addClass('file-delete file-button fileManager')
                    .attr('title', 'Delete')
                    .attr('data-func', 'deleteFile')
                    .attr('data-name', item.name + '/' + child.name)
                    .appendTo(subListItem)
                    .on('click', (e) => this.deleteFile(e));
              var renameButton = $('<button></button>')
                    .addClass('file-rename file-button fileManager')
                    .attr('title', 'Rename')
                    .attr('data-func', 'renameFile')
                    .attr('data-name', child.name)
                    .attr('data-folder', item.name)
                    .appendTo(subListItem)
                    .on('click', (e) => this.renameFile(e));
    	        var downloadButton = $('<button></button>')
                    .addClass('file-download file-button fileManager')
                    .attr('href-stem', '/download?project=' + data.currentProject + '&file=')
                    .attr('data_name', item.name + '/' + child.name)
                    .appendTo(subListItem)
                    .on('click', (e, projName) => this.downloadFile(e, data.currentProject));
              subListItem.appendTo(subList);
            }
            subList.appendTo(listItem);
          }
	      }
	      fileList.appendTo(section);
	      section.appendTo($files);
			}
		}
		if (data && data.fileName) this._fileName(data.fileName);

	}

	downloadFile(e, projName) {
		var filename = $(e.target).attr('data_name');
		var project = projName;
		var href = $(e.target).attr('href-stem') + filename;
    e.preventDefault();  //stop the browser from following the link
    window.location.href = href;
	}

	_fileName(file, data){

		// select the opened file in the file manager tab
		$('.selectedFile').removeClass('selectedFile');

		var foundFile = false
		$('[data-file-list]').find('li').each(function(){
			if ($(this).data('file') === file){
				$(this).addClass('selected');
				foundFile = true;
			} else {
				$(this).removeClass('selected');
			}
		});


	}

	doFileUpload(file){

		if (uploadingFile){
			fileQueue.push(file);
			return;
		}

		var fileExists = false;
		for (let item of this.listOfFiles){
			if (item.name === sanitise(file.name)) fileExists = true;
		}

		if (file.name === 'settings.json') fileExists = true;

		if (file.name === '_main.pd') forceRebuild = true;

		if (fileExists && askForOverwrite){

			uploadingFile = true;

			// build the popup content
			popup.title(json.popups.overwrite.title);
			popup.subtitle(file.name + json.popups.overwrite.text);

			var form = [];
			form.push('<input id="popup-remember-upload" type="checkbox">');
			form.push('<label for="popup-remember-upload">' + json.popups.overwrite.tick + '</label>')
			form.push('</br >');
			form.push('<button type="submit" class="button confirm">' + json.popups.overwrite.button + '</button>');
			form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

			popup.form.append(form.join('')).off('submit').on('submit', e => {
				e.preventDefault();
				if (popup.find('input[type=checkbox]').is(':checked')){
					askForOverwrite = false;
					overwriteAction = 'upload';
				}
				popup.hide();
				this.actuallyDoFileUpload(file, true);
				uploadingFile = false;
				if (fileQueue.length){
					this.doFileUpload(fileQueue.pop());
				}
			});

			popup.find('.cancel').on('click', () => {
				if (popup.find('input[type=checkbox]').is(':checked')){
					askForOverwrite = false;
					overwriteAction = 'reject';
				}
				popup.hide();
				uploadingFile = false;
				forceRebuild = false;
				if (fileQueue.length) this.doFileUpload(fileQueue.pop());
			});

			popup.show();

			popup.find('.cancel').focus();

		} else if (fileExists && !askForOverwrite){

			if (overwriteAction === 'upload')
				this.actuallyDoFileUpload(file, !askForOverwrite);
			else {
				this.emit('file-rejected', file.name);
			}

			if (fileQueue.length) this.doFileUpload(fileQueue.pop());

		} else {

			this.actuallyDoFileUpload(file, !askForOverwrite);
			if (fileQueue.length) this.doFileUpload(fileQueue.pop());

		}
	}

  doLargeFileUpload(formData, file, location, force){
    var fileName = file.value.split('\\').pop();
    var popupBlock = $('[data-popup-nointeraction]').addClass('active');
    var that = this;
    $.ajax({
      type: "POST",
      url: '/uploads',
      enctype: 'multipart/form-data',
      processData: false,
      contentType: false,
      data: formData,
      success: function(r){
        that.emit('message', 'project-event', {func: 'moveUploadedFile', sanitisedNewFile: sanitise(fileName), newFile: fileName});
        $('body').removeClass('uploading');
        popupBlock.removeClass('active');
        popup.hide();
      },
      error: function(e) {
        popup.hide();
        popup.title(json.popups.upload_file_error.title);
    		popup.subtitle(e);

    		var form = [];
    		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

    		popup.find('.cancel').on('click', popup.hide );
        $('body').removeClass('uploading');
        popupBlock.removeClass('active');
    		popup.show();
      }
    });
    this.emit('force-rebuild');
  }

	actuallyDoFileUpload(file, force){
		var reader = new FileReader();
		if (forceRebuild && !fileQueue.length){
			forceRebuild = false;
			this.emit('force-rebuild');
		}
		let uploadEmit = (ev) => this.emit('message', 'project-event', {func: 'uploadFile', newFile: sanitise(file.name), fileData: ev.target.result, force} );

		if (file.name.search(/\.zip$/) != -1) {
			let newProject = sanitise(file.name.replace(/\.zip$/, ""));
			let values = { extract: "extract", asIs: "asIs" };
			var form = [];
			popup.title(json.popups.create_new_project_from_zip.title + file.name);
			popup.subtitle(json.popups.create_new_project_from_zip.text);

			form.push('<input type="text" placeholder="' + json.popups.create_new_project_from_zip.input + '" value="' + newProject + '" />');
			form.push('<p class="create_file_subtext">' + json.popups.create_new_project_from_zip.sub_text + '</p>');
  			form.push('<br/><br/>');
			form.push('<button type="submit" class="button popup confirm">' + json.popups.create_new_project_from_zip.button + '</button>');
			form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');
			
			popup.form.empty().append(form.join('')).off('submit').on('submit', e => {
				e.preventDefault();
				newProject = sanitise(popup.find('input[type=text]').val());
				reader.onload = (ev) => this.emit('message', 'project-event', {func: 'uploadZipProject', newFile: sanitise(file.name), fileData: ev.target.result, newProject, force} );
				reader.readAsArrayBuffer(file);
				popup.hide();
			});
			popup.find('.cancel').on('click', popup.hide );
			popup.show();
		} else {
			reader.onload = uploadEmit;
			reader.readAsArrayBuffer(file);
		}
	}

	_viewHiddenFiles(val){
		viewHiddenFiles = val;
		if (firstViewHiddenFiles){
			firstViewHiddenFiles = false;
		} else {
			this.emit('message', 'project-event', {func: 'openProject', timestamp: performance.now()} );
		}
	}

}

function isDir(item){
	return ((typeof item.size) === 'undefined' && (typeof item.children) !== 'undefined');
}

module.exports = FileView;
