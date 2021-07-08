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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = require("child_process");
var file_manager = require("./FileManager");
var socket_manager = require("./SocketManager");
var processes = require("./IDEProcesses");
var paths = require("./paths");
var Lock_1 = require("./Lock");
var cpu_monitor = require("./CPUMonitor");
var path = require("path");
var MostRecentQueue_1 = require("./MostRecentQueue");
var globals = require("./globals");
var lock = new Lock_1.Lock("ProcessManager");
var syntaxTimeout; // storing the value returned by setTimeout
var syntaxTimeoutMs = 300; // ms between received data and start of syntax checking
var extensionsForSyntaxCheck = ['.cpp', '.c', '.h', '.hh', '.hpp'];
function makePath(data) {
    return paths.projects + data.currentProject + '/' + data.newFile;
}
var queuedUploads = new MostRecentQueue_1.MostRecentQueue();
// the file data is saved robustly using a lockfile, and a syntax
// check started if the flag is set
function processUploads() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, id, data, ext, e_1, e_2_1, e_2, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!queuedUploads.size) return [3 /*break*/, 11];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 8, 9, 10]);
                    _a = __values(queuedUploads.keys()), _b = _a.next();
                    _d.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 7];
                    id = _b.value;
                    if (globals.verbose)
                        console.log("SAVING:", id);
                    data = queuedUploads.pop(id);
                    if (!data) {
                        console.log("WARNING: processUpload: found no data for", id);
                        return [3 /*break*/, 6];
                    }
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, file_manager.save_file(makePath(data), data.fileData, paths.lockfile)];
                case 4:
                    _d.sent();
                    if (globals.verbose)
                        console.log("SAVED", id);
                    ext = path.extname(data.newFile);
                    if (data.checkSyntax && (extensionsForSyntaxCheck.indexOf(ext) >= 0)) { // old typescript doesn't like .includes()
                        clearTimeout(syntaxTimeout);
                        syntaxTimeout = global.setTimeout(function (data) {
                            checkSyntax(data);
                        }.bind(null, { currentProject: data.currentProject }), syntaxTimeoutMs);
                    }
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _d.sent();
                    console.log(data);
                    console.log(e_1);
                    return [3 /*break*/, 6];
                case 6:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_2_1 = _d.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 10: return [3 /*break*/, 0];
                case 11:
                    lock.release();
                    return [2 /*return*/];
            }
        });
    });
}
// this function gets called whenever the ace editor is modified.
// New data will be pushed to the queue, overwriting any old data.
function upload(data) {
    return __awaiter(this, void 0, void 0, function () {
        var id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = makePath(data);
                    queuedUploads.push(id, data);
                    // notify all clients this file has been edited
                    socket_manager.broadcast('file-changed', {
                        currentProject: data.currentProject,
                        fileName: data.newFile,
                        clientId: data.clientId,
                    });
                    if (!!lock.acquired) return [3 /*break*/, 2];
                    return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    // If not already running, process uploads at the first chance
                    // note: this could actually be called directly from here (with or without await),
                    // but this way it gives sort of a cleaner "thread-like" behaviour
                    setTimeout(processUploads, 0);
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
exports.upload = upload;
// this function starts a syntax check
// if a syntax check or build process is in progress they are stopped
// a running program is not stopped
// this can be called either from upload() or from the frontend (via SocketManager)
function checkSyntax(data) {
    if (!data.currentProject)
        return;
    var project = data.currentProject;
    if (processes.syntax.get_status()) {
        processes.syntax.stop();
        processes.syntax.queue(function () { return processes.syntax.start(project); });
    }
    else if (processes.build.get_status()) {
        processes.build.stop();
        processes.build.queue(function () { return processes.syntax.start(project); });
    }
    else {
        processes.syntax.start(project);
    }
}
exports.checkSyntax = checkSyntax;
// this function is called when the run button is clicked
// if a program is already building or running it is stopped and restarted
// any syntax check in progress is stopped
function run(data) {
    cpu_monitor.stop();
    if (processes.run.get_status()) {
        processes.run.stop();
        processes.run.queue(function () { return build_run(data.currentProject); });
    }
    else if (processes.build.get_status()) {
        processes.build.stop();
        processes.build.queue(function () { return build_run(data.currentProject); });
    }
    else if (processes.syntax.get_status()) {
        processes.syntax.stop();
        processes.syntax.queue(function () { return build_run(data.currentProject); });
    }
    else {
        build_run(data.currentProject);
    }
}
exports.run = run;
// this function starts a build process and when it ends it checks
// if it was stopped by a call to stop() or if there were build errors
// if neither of these are true the project is immediately run
function build_run(project) {
    processes.build.start(project);
    processes.build.queue(function (stderr, killed, code) {
        if (!killed && !code) {
            processes.run.start(project);
        }
    });
}
// this function parses the stderr output of the build process 
// returning true if build errors (not warnings) are found
function build_error(stderr) {
    var lines = stderr.split('\n');
    try {
        for (var lines_1 = __values(lines), lines_1_1 = lines_1.next(); !lines_1_1.done; lines_1_1 = lines_1.next()) {
            var line = lines_1_1.value;
            var split_line = line.split(':');
            if (split_line.length >= 4) {
                if (split_line[3] === ' error' || split_line[3] === ' fatal error') {
                    return true;
                }
                else if (split_line[3] === ' warning') {
                    //console.log('warning');
                }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (lines_1_1 && !lines_1_1.done && (_a = lines_1.return)) _a.call(lines_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return false;
    var e_3, _a;
}
// this function is called when the stop button is clicked
// it calls the stop() method of any running process
// if there is no running process, 'make stop' is called
function stop() {
    cpu_monitor.stop();
    var stopped = false;
    if (processes.run.get_status()) {
        processes.run.stop();
        stopped = true;
    }
    if (processes.build.get_status()) {
        processes.build.stop();
        stopped = true;
    }
    if (processes.syntax.get_status()) {
        processes.syntax.stop();
        stopped = true;
    }
    if (!stopped) {
        console.log('make -C ' + paths.Bela + ' stop');
        child_process.exec('make -C ' + paths.Bela + ' stop');
    }
}
exports.stop = stop;
function get_status() {
    return {
        checkingSyntax: processes.syntax.get_status(),
        building: processes.build.get_status(),
        buildProject: (processes.build.get_status() ? processes.build.project : ''),
        running: processes.run.get_status(),
        runProject: (processes.run.get_status() ? processes.run.project : '')
    };
}
// each process emits start and finish events, which are handled here
processes.syntax.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
processes.syntax.on('finish', function (stderr, killed) {
    if (!killed) {
        var status_1 = get_status();
        status_1.syntaxError = stderr;
        socket_manager.broadcast('status', status_1);
    }
});
processes.build.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
processes.build.on('finish', function (stderr, killed) {
    var status = get_status();
    status.syntaxError = stderr;
    socket_manager.broadcast('status', status);
    if (!killed)
        socket_manager.broadcast('std-warn', stderr);
});
processes.build.on('stdout', function (data) { return socket_manager.broadcast('status', { buildLog: data }); });
processes.run.on('start', function (pid, project) {
    socket_manager.broadcast('status', get_status());
    cpu_monitor.start(pid, project, function (cpu) { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _b = (_a = socket_manager).broadcast;
                    _c = ['cpu-usage'];
                    _d = {};
                    return [4 /*yield*/, file_manager.read_file(paths.xenomai_stat).catch(function (e) { return console.log('error reading xenomai stats', e); })];
                case 1:
                    _b.apply(_a, _c.concat([(_d.bela = _e.sent(),
                            _d.belaLinux = cpu,
                            _d)]));
                    return [2 /*return*/];
            }
        });
    }); });
});
processes.run.on('finish', function (project) {
    socket_manager.broadcast('status', get_status());
    cpu_monitor.stop();
});
processes.run.on('stdout', function (data) { return socket_manager.broadcast('status', { belaLog: data }); });
processes.run.on('stderr', function (data) { return socket_manager.broadcast('status', { belaLogErr: data }); });
