"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var file_manager = require("./FileManager");
var git_manager = require("./GitManager");
var project_settings = require("./ProjectSettings");
var paths = require("./paths");
var readChunk = require("read-chunk");
var fileType = require("file-type");
var DecompressZip = require("decompress-zip");
var socket_manager = require("./SocketManager");
var max_file_size = 52428800; // bytes (50Mb)
var max_preview_size = 524288000; // bytes (500Mb)
function emptyObject(obj) {
    Object.keys(obj).forEach(function (key) { delete obj[key]; });
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
function openFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, file_stat, e_1, _a, _b, file, e_2_1, chunk, file_type, is_binary, _c, e_3, e_2, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (typeof data.newFile == 'undefined') {
                        data.newFile = data.fileName;
                    }
                    if (null === data.newFile) {
                        return [2 /*return*/];
                    }
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 12]);
                    return [4 /*yield*/, file_manager.stat_file(file_path)];
                case 2:
                    file_stat = _e.sent();
                    return [3 /*break*/, 12];
                case 3:
                    e_1 = _e.sent();
                    if (!(typeof data.exampleName !== 'undefined' || data.func === 'newProject')) return [3 /*break*/, 11];
                    _e.label = 4;
                case 4:
                    _e.trys.push([4, 9, 10, 11]);
                    _a = __values(data.fileList), _b = _a.next();
                    _e.label = 5;
                case 5:
                    if (!!_b.done) return [3 /*break*/, 8];
                    file = _b.value;
                    if (!file.name.includes('_main')) return [3 /*break*/, 7];
                    data.newFile = file.name;
                    return [4 /*yield*/, openFile(data)];
                case 6:
                    _e.sent();
                    return [2 /*return*/];
                case 7:
                    _b = _a.next();
                    return [3 /*break*/, 5];
                case 8: return [3 /*break*/, 11];
                case 9:
                    e_2_1 = _e.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 11];
                case 10:
                    try {
                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 11:
                    data.error = 'Error opening file ' + data.newFile + ': file does not exist.';
                    data.fileData = null;
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = true;
                    data.fileType = 0;
                    return [2 /*return*/];
                case 12:
                    if (file_stat.size > max_preview_size) {
                        data.error = 'file is too large: ' + (file_stat.size / 1048576) + 'Mb';
                        data.fileData = "The IDE can't open files larger than " + (max_preview_size / 1048576) + "Mb";
                        data.readOnly = true;
                        data.fileName = data.newFile;
                        data.newFile = undefined;
                        data.fileType = 0;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, readChunk(file_path, 0, 4100)];
                case 13:
                    chunk = _e.sent();
                    return [4 /*yield*/, fileType(chunk)];
                case 14:
                    file_type = _e.sent();
                    data.mtime = file_stat.mtime;
                    if (!(file_type && (file_type.mime.includes('image') || file_type.mime.includes('audio')))) return [3 /*break*/, 17];
                    return [4 /*yield*/, file_manager.empty_directory(paths.media)];
                case 15:
                    _e.sent();
                    return [4 /*yield*/, file_manager.make_symlink(file_path, paths.media + data.newFile)];
                case 16:
                    _e.sent();
                    data.fileData = '';
                    data.readOnly = true;
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.fileType = file_type.mime;
                    return [2 /*return*/];
                case 17: return [4 /*yield*/, file_manager.is_binary(file_path)];
                case 18:
                    is_binary = _e.sent();
                    if (is_binary) {
                        data.error = 'can\'t open binary files';
                        data.fileData = 'Binary files can not be edited in the IDE';
                        data.fileName = data.newFile;
                        data.newFile = undefined;
                        data.readOnly = true;
                        data.fileType = 0;
                        return [2 /*return*/];
                    }
                    _e.label = 19;
                case 19:
                    _e.trys.push([19, 21, , 22]);
                    _c = data;
                    return [4 /*yield*/, file_manager.read_file(file_path)];
                case 20:
                    _c.fileData = _e.sent();
                    return [3 /*break*/, 22];
                case 21:
                    e_3 = _e.sent();
                    data.error = 'error opening file ' + data.newFile + ': ' + e_3.toString();
                    data.fileData = 'Error opening file. Please open a different file to continue';
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = true;
                    data.fileType = 0;
                    return [2 /*return*/];
                case 22:
                    if (data.newFile.split && data.newFile.includes('.')) {
                        data.fileType = data.newFile.split('.').pop();
                    }
                    else {
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
                    return [2 /*return*/];
            }
        });
    });
}
exports.openFile = openFile;
// these two methods are exceptions and don't take the data object
function listProjects() {
    return __awaiter(this, void 0, void 0, function () {
        var projects;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.read_subfolders(paths.projects)];
                case 1:
                    projects = _a.sent();
                    return [2 /*return*/, projects];
            }
        });
    });
}
exports.listProjects = listProjects;
function listLibraries() {
    return __awaiter(this, void 0, void 0, function () {
        var libraries, categories, categories_1, categories_1_1, category, _a, _b, _c, e_4_1, e_4, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    libraries = [];
                    return [4 /*yield*/, file_manager.read_directory(paths.libraries)];
                case 1:
                    categories = _e.sent();
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 8, 9, 10]);
                    categories_1 = __values(categories), categories_1_1 = categories_1.next();
                    _e.label = 3;
                case 3:
                    if (!!categories_1_1.done) return [3 /*break*/, 7];
                    category = categories_1_1.value;
                    return [4 /*yield*/, file_manager.directory_exists(paths.libraries + '/' + category)];
                case 4:
                    if (!_e.sent()) return [3 /*break*/, 6];
                    _b = (_a = libraries).push;
                    _c = {
                        name: category
                    };
                    return [4 /*yield*/, file_manager.read_directory(paths.libraries + '/' + category)];
                case 5:
                    _b.apply(_a, [(_c.children = _e.sent(),
                            _c)]);
                    _e.label = 6;
                case 6:
                    categories_1_1 = categories_1.next();
                    return [3 /*break*/, 3];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_4_1 = _e.sent();
                    e_4 = { error: e_4_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (categories_1_1 && !categories_1_1.done && (_d = categories_1.return)) _d.call(categories_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/, libraries];
            }
        });
    });
}
exports.listLibraries = listLibraries;
function listExamples() {
    return __awaiter(this, void 0, void 0, function () {
        var examples, categories, categories_2, categories_2_1, category, parsedChildren, children, children_1, children_1_1, child, e_5_1, e_5, _a, e_6, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    examples = [];
                    return [4 /*yield*/, file_manager.read_directory(paths.examples)];
                case 1:
                    categories = _c.sent();
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 8, 9, 10]);
                    categories_2 = __values(categories), categories_2_1 = categories_2.next();
                    _c.label = 3;
                case 3:
                    if (!!categories_2_1.done) return [3 /*break*/, 7];
                    category = categories_2_1.value;
                    parsedChildren = [];
                    return [4 /*yield*/, file_manager.directory_exists(paths.examples + '/' + category)];
                case 4:
                    if (!_c.sent()) return [3 /*break*/, 6];
                    return [4 /*yield*/, file_manager.read_directory(paths.examples + '/' + category)];
                case 5:
                    children = _c.sent();
                    try {
                        for (children_1 = __values(children), children_1_1 = children_1.next(); !children_1_1.done; children_1_1 = children_1.next()) {
                            child = children_1_1.value;
                            if (child.split('.').length < 2 || child.split('.').pop() === 'json') {
                                parsedChildren.push(child);
                            }
                            else {
                                console.log(child);
                                console.log('^^ this is NOT a json file or folder ^^');
                            }
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (children_1_1 && !children_1_1.done && (_b = children_1.return)) _b.call(children_1);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                    examples.push({
                        name: category,
                        children: parsedChildren
                    });
                    parsedChildren = [];
                    _c.label = 6;
                case 6:
                    categories_2_1 = categories_2.next();
                    return [3 /*break*/, 3];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_5_1 = _c.sent();
                    e_5 = { error: e_5_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (categories_2_1 && !categories_2_1.done && (_a = categories_2.return)) _a.call(categories_2);
                    }
                    finally { if (e_5) throw e_5.error; }
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/, examples];
            }
        });
    });
}
exports.listExamples = listExamples;
// this only opens the project, but a notification needs to be emitted to the
// frontend to actually switch project
function openProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        var projectRetryString, exists, _a, settings;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    projectRetryString = "Select a project from the projects menu, or create a new one.";
                    if (!data.currentProject.trim()) {
                        data.error = "No project is selected. " + projectRetryString;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, projectExists(data.currentProject)];
                case 1:
                    exists = _b.sent();
                    if (!exists) {
                        data.error = "Project `" + data.currentProject + "' does not exist. " + projectRetryString;
                        return [2 /*return*/];
                    }
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 2:
                    _a.fileList = _b.sent();
                    return [4 /*yield*/, project_settings.read(data.currentProject)];
                case 3:
                    settings = _b.sent();
                    data.newFile = settings.fileName;
                    data.CLArgs = settings.CLArgs;
                    if (data.currentProject !== 'exampleTempProject')
                        data.exampleName = '';
                    if (!data.gitData)
                        data.gitData = {};
                    data.gitData.currentProject = data.currentProject;
                    return [4 /*yield*/, git_manager.info(data.gitData)];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, openFile(data)];
                case 5:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.openProject = openProject;
function openExample(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.empty_directory(paths.exampleTempProject)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.copy_directory(paths.examples + data.currentProject, paths.exampleTempProject)];
                case 2:
                    _a.sent();
                    data.exampleName = data.currentProject.split('/').pop();
                    data.currentProject = 'exampleTempProject';
                    return [4 /*yield*/, openProject(data)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.openExample = openExample;
function newProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (typeof (data.newProject) === "string") {
                        data.newProject = data.newProject.trim();
                    }
                    if (!data.newProject) {
                        data.error = 'failed, project name is empty.';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.directory_exists(paths.projects + data.newProject)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, project ' + data.newProject + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.copy_directory(paths.templates + data.projectType, paths.projects + data.newProject)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listProjects()];
                case 3:
                    _a.projectList = _b.sent();
                    data.currentProject = data.newProject;
                    data.newProject = undefined;
                    return [4 /*yield*/, openProject(data)];
                case 4:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.newProject = newProject;
function saveAs(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file_manager.directory_exists(paths.projects + data.newProject)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, project ' + data.newProject + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, cleanProject(data)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, file_manager.copy_directory(paths.projects + data.currentProject, paths.projects + data.newProject)];
                case 3:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listProjects()];
                case 4:
                    _a.projectList = _b.sent();
                    data.currentProject = data.newProject;
                    data.newProject = undefined;
                    return [4 /*yield*/, openProject(data)];
                case 5:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.saveAs = saveAs;
function deleteProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, _c, project, e_7_1, e_7, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, file_manager.delete_file(paths.projects + data.currentProject)];
                case 1:
                    _e.sent();
                    _a = data;
                    return [4 /*yield*/, listProjects()];
                case 2:
                    _a.projectList = _e.sent();
                    _e.label = 3;
                case 3:
                    _e.trys.push([3, 8, 9, 10]);
                    _b = __values(data.projectList), _c = _b.next();
                    _e.label = 4;
                case 4:
                    if (!!_c.done) return [3 /*break*/, 7];
                    project = _c.value;
                    if (!(project && project !== 'undefined' && project !== 'exampleTempProject')) return [3 /*break*/, 6];
                    data.currentProject = project;
                    return [4 /*yield*/, openProject(data)];
                case 5:
                    _e.sent();
                    return [2 /*return*/];
                case 6:
                    _c = _b.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_7_1 = _e.sent();
                    e_7 = { error: e_7_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (_c && !_c.done && (_d = _b.return)) _d.call(_b);
                    }
                    finally { if (e_7) throw e_7.error; }
                    return [7 /*endfinally*/];
                case 10:
                    data.currentProject = '';
                    data.readOnly = true;
                    data.fileData = 'please create a new project to continue';
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteProject = deleteProject;
function cleanProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.empty_directory(paths.projects + data.currentProject + '/build')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(paths.projects + data.currentProject + '/' + data.currentProject)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.cleanProject = cleanProject;
function newFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_name, file_path, folder, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    file_name = data.newFile.split('/').pop();
                    if (data.folder) {
                        folder = data.folder;
                        file_path = paths.projects + data.currentProject + '/' + folder + '/' + file_name;
                        data.newFile = folder + '/' + file_name;
                    }
                    else {
                        file_path = paths.projects + data.currentProject + '/' + file_name;
                        data.newFile = file_name;
                    }
                    return [4 /*yield*/, file_manager.file_exists(file_path)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, file ' + file_path + ' already exists!';
                        return [2 /*return*/];
                    }
                    file_manager.write_file(file_path, '/***** ' + file_name + ' *****/\n');
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 2:
                    _a.fileList = _b.sent();
                    data.focus = { 'line': 2, 'column': 1 };
                    return [4 /*yield*/, openFile(data)];
                case 3:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.newFile = newFile;
function newFolder(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log(data);
                    file_path = paths.projects + data.currentProject + '/' + data.newFolder;
                    return [4 /*yield*/, file_manager.directory_exists(file_path)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, folder ' + data.newFolder + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.write_folder(file_path)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 3:
                    _a.fileList = _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.newFolder = newFolder;
function uploadFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, file_exists, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
                    return [4 /*yield*/, file_manager.file_exists(file_path)];
                case 1:
                    _a = (_c.sent());
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, file_manager.directory_exists(file_path)];
                case 2:
                    _a = (_c.sent());
                    _c.label = 3;
                case 3:
                    file_exists = (_a);
                    if (file_exists && !data.force) {
                        data.error = 'failed, file ' + data.newFile + ' already exists!';
                        data.fileData = undefined;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.save_file(file_path, data.fileData)];
                case 4:
                    _c.sent();
                    _b = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 5:
                    _b.fileList = _c.sent();
                    return [4 /*yield*/, openFile(data)];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.uploadFile = uploadFile;
function uploadZipProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var tmp_path, tmp_target_path, target_path, file_exists, _a, _cleanup;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tmp_path = paths.tmp + data.newFile;
                    tmp_target_path = tmp_path.replace(/\.zip$/, "/");
                    target_path = paths.projects + data.newProject;
                    return [4 /*yield*/, file_manager.file_exists(target_path)];
                case 1:
                    _a = (_b.sent());
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, file_manager.directory_exists(target_path)];
                case 2:
                    _a = (_b.sent());
                    _b.label = 3;
                case 3:
                    file_exists = (_a);
                    if (file_exists && !data.force) {
                        data.error = 'Failed to create project ' + data.newProject + ': it already exists!';
                        data.fileData = null;
                        data.fileName = null;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.save_file(tmp_path, data.fileData)];
                case 4:
                    _b.sent();
                    _cleanup = function (tmp_path, tmp_target_path) {
                        //file_manager.delete_file(tmp_path);
                        //file_manager.delete_file(tmp_target_path);
                    }.bind(null, tmp_path, tmp_target_path);
                    _cleanup();
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            var pathsToRemove = ["__MACOSX", ".DS_Store"];
                            var unzipper = new DecompressZip(tmp_path);
                            unzipper.on("extract", function (e) { return __awaiter(_this, void 0, void 0, function () {
                                var fileList, isRoot, source_path;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, file_manager.deep_read_directory(tmp_target_path)];
                                        case 1:
                                            fileList = _a.sent();
                                            isRoot = false;
                                            if (fileList.length > 1)
                                                isRoot = true;
                                            else {
                                                if (fileList[0] && fileList[0].size !== undefined)
                                                    isRoot = true;
                                            }
                                            if (isRoot) {
                                                source_path = tmp_target_path;
                                                console.log("Use as is: ", source_path);
                                            }
                                            else {
                                                // peel off the first folder
                                                source_path = tmp_target_path + fileList[0].name + "/";
                                                console.log("Strip off the top-level folder: ", source_path);
                                            }
                                            return [4 /*yield*/, file_manager.copy_directory(source_path, target_path)];
                                        case 2:
                                            _a.sent();
                                            data.currentProject = data.newProject;
                                            return [4 /*yield*/, openProject(data)];
                                        case 3:
                                            _a.sent();
                                            _cleanup();
                                            resolve();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            unzipper.on("error", function (e) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    data.fileData = null;
                                    data.fileName = null;
                                    data.error = "Error extracting zip archive " + tmp_path + ": " + e.message;
                                    _cleanup();
                                    resolve();
                                    return [2 /*return*/];
                                });
                            }); });
                            unzipper.extract({
                                path: tmp_target_path,
                                filter: function (file) {
                                    var matching = pathsToRemove.filter(function (needle) {
                                        var path = file.path;
                                        var reg = RegExp("\\b" + needle + "\\b");
                                        return needle === file.filename || path.search(reg) != -1;
                                    });
                                    return 0 === matching.length;
                                }
                            });
                        })];
            }
        });
    });
}
exports.uploadZipProject = uploadZipProject;
function cleanFile(project, file) {
    return __awaiter(this, void 0, void 0, function () {
        var split_file, ext, file_root, file_path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(file.split && file.includes('.'))) return [3 /*break*/, 4];
                    split_file = file.split('.');
                    ext = split_file.pop();
                    file_root = split_file.join('.');
                    if (!(ext === 'cpp' || ext === 'c' || ext === 'S')) return [3 /*break*/, 4];
                    file_path = paths.projects + project + '/build/' + file_root;
                    return [4 /*yield*/, file_manager.delete_file(file_path + '.d')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(file_path + '.o')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(paths.projects + project + '/' + project)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.cleanFile = cleanFile;
function moveUploadedFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file_manager.rename_file(paths.uploads + data.newFile, paths.projects + data.currentProject + '/' + data.sanitisedNewFile)];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.sanitisedNewFile)];
                case 2:
                    _b.sent();
                    data.newFile = data.sanitisedNewFile;
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 3:
                    _a.fileList = _b.sent();
                    return [4 /*yield*/, openFile(data)];
                case 4:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.moveUploadedFile = moveUploadedFile;
function renameFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var old_file_name, file_name, file_path, folder, new_file_path, file_exists, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    old_file_name = data.oldName;
                    file_name = data.oldName.split('/').pop();
                    if (data.folder) {
                        folder = data.folder + '/';
                        file_path = paths.projects + data.currentProject + '/' + folder + file_name;
                    }
                    else {
                        file_path = paths.projects + data.currentProject + '/' + file_name;
                    }
                    new_file_path = file_path.replace(file_name, data.newFile);
                    return [4 /*yield*/, file_manager.file_exists(new_file_path)];
                case 1:
                    _a = (_c.sent());
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, file_manager.directory_exists(file_path)];
                case 2:
                    _a = (_c.sent());
                    _c.label = 3;
                case 3:
                    file_exists = (_a);
                    if (file_exists) {
                        data.error = 'failed, file ' + data.newFile + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.rename_file(file_path, new_file_path)];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.oldName)];
                case 5:
                    _c.sent();
                    if (!(data.fileName == data.oldName)) return [3 /*break*/, 7];
                    data.fileName = data.newFile;
                    return [4 /*yield*/, openFile(data)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _b = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 8:
                    _b.fileList = _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.renameFile = renameFile;
function renameFolder(data) {
    return __awaiter(this, void 0, void 0, function () {
        var folder_path, new_folder_path, folder_exists, _a, regex;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    folder_path = paths.projects + data.currentProject + "/" + data.oldName;
                    new_folder_path = paths.projects + data.currentProject + "/" + data.newFolder;
                    return [4 /*yield*/, file_manager.directory_exists(new_folder_path)];
                case 1:
                    folder_exists = _b.sent();
                    if (folder_exists) {
                        data.error = 'failed, file ' + data.newFolder + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.rename_file(folder_path, new_folder_path)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.oldName)];
                case 3:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 4:
                    _a.fileList = _b.sent();
                    regex = RegExp(data.oldName);
                    if (!regex.test(data.fileName)) return [3 /*break*/, 6];
                    data.fileName = data.fileName.replace(data.oldName, data.newFolder);
                    return [4 /*yield*/, openFile(data)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.renameFolder = renameFolder;
function deleteFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file_manager.delete_file(paths.projects + data.currentProject + '/' + data.fileName)];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.fileName)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 3:
                    _a.fileList = _b.sent();
                    if (data.fileName == data.currentFile) {
                        //TODO: ideally we would send a message to the frontend, but currently we
                        //can only send "errors", and we don't want to
                        data.fileData = null;
                        data.fileName = null;
                        data.readOnly = true;
                    }
                    else {
                        data.fileName = data.currentFile;
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteFile = deleteFile;
function listFiles(project) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.deep_read_directory(paths.projects + project)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.listFiles = listFiles;
function projectExists(project) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.directory_exists(paths.projects + project)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.projectExists = projectExists;
