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
var express = require("express");
var http = require("http");
var multer = require("multer");
var child_process = require("child_process");
var socket_manager = require("./SocketManager");
var file_manager = require("./FileManager");
var paths = require("./paths");
var routes = require("./RouteManager");
var path = require("path");
var fs = require("fs-extra-promise");
var globals = require("./globals");
var TerminalManager = require('./TerminalManager');
function init(args) {
    return __awaiter(this, void 0, void 0, function () {
        var httpPort, ideDev, n, arg, app, server;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    httpPort = 80;
                    // load customised "dev" settings, if available. See
                    // IDE/ide-dev.js.template for details on the file content
                    try {
                        ideDev = require('../ide-dev.js');
                        if (ideDev) {
                            console.log("ideDev: ", ideDev);
                            if (ideDev.hasOwnProperty('Bela'))
                                paths.set_Bela(ideDev.Bela);
                            if (ideDev.hasOwnProperty('local_dev'))
                                globals.set_local_dev(ideDev.local_dev);
                            if (ideDev.hasOwnProperty('httpPort'))
                                httpPort = ideDev.httpPort;
                            if (ideDev.hasOwnProperty('verbose'))
                                globals.set_verbose(ideDev.verbose);
                        }
                    }
                    catch (err) { }
                    n = 0;
                    while (n < args.length) {
                        arg = args[n];
                        switch (arg) {
                            case "-v":
                                globals.set_verbose(1);
                                break;
                        }
                        ++n;
                    }
                    // ensure required folders exist
                    return [4 /*yield*/, fs.mkdirp(paths.projects)];
                case 1:
                    // ensure required folders exist
                    _a.sent();
                    console.log('starting IDE from ' + paths.Bela);
                    return [4 /*yield*/, check_lockfile()
                            .catch(function (e) { return console.log('error checking lockfile', e); })];
                case 2:
                    _a.sent();
                    app = express();
                    server = new http.Server(app);
                    setup_routes(app);
                    // start serving the IDE
                    server.listen(httpPort, function () { return console.log('listening on port', httpPort); });
                    // initialise websocket
                    socket_manager.init(server);
                    TerminalManager.init();
                    return [2 /*return*/];
            }
        });
    });
}
exports.init = init;
var backup_file_stats = {};
function check_lockfile() {
    return __awaiter(this, void 0, void 0, function () {
        var lockfile_exists, file_path, filename, project_path, tmp_backup_file, backup_file_exists, backup_filename;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.file_exists(paths.lockfile)];
                case 1:
                    lockfile_exists = _a.sent();
                    if (!lockfile_exists) {
                        backup_file_stats.exists = false;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.read_file(paths.lockfile)];
                case 2:
                    file_path = _a.sent();
                    filename = path.basename(file_path);
                    project_path = path.dirname(file_path) + '/';
                    tmp_backup_file = project_path + '.' + filename + '~';
                    return [4 /*yield*/, file_manager.file_exists(tmp_backup_file)];
                case 3:
                    backup_file_exists = _a.sent();
                    if (!backup_file_exists) {
                        backup_file_stats.exists = false;
                        return [2 /*return*/];
                    }
                    backup_filename = filename + '.bak';
                    return [4 /*yield*/, file_manager.copy_file(tmp_backup_file, project_path + backup_filename)];
                case 4:
                    _a.sent();
                    console.log('backup file copied to', project_path + backup_filename);
                    backup_file_stats.exists = true;
                    backup_file_stats.filename = filename;
                    backup_file_stats.backup_filename = backup_filename;
                    backup_file_stats.project = path.basename(project_path);
                    return [4 /*yield*/, file_manager.delete_file(paths.lockfile)];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.check_lockfile = check_lockfile;
function get_backup_file_stats() {
    return backup_file_stats;
}
exports.get_backup_file_stats = get_backup_file_stats;
function setup_routes(app) {
    // static paths
    app.use(express.static(paths.webserver_root)); // all files in this directory are served to bela.local/
    app.use('/documentation', express.static(paths.Bela + 'Documentation/html'));
    app.use('/projects', express.static(paths.Bela + 'projects'));
    // ajax routes
    var storage = multer.diskStorage({
        destination: paths.uploads,
        filename: function (req, file, callback) {
            callback(null, file.originalname);
            console.log('file is', file);
        }
    });
    app.post('/uploads', function (req, res) {
        var upload = multer({ storage: storage }).single('data');
        upload(req, res, function (err) {
            if (err) {
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
function get_bela_core_version() {
    var _this = this;
    return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
        var data, updateLog, e_1, tokens, matches, keys, tokens_1, tokens_1_1, str, n, reg, stat, dir, cmd, e_2, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    data = {};
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs.readFileAsync(paths.update_log, 'utf8')];
                case 2:
                    updateLog = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    if (!updateLog) return [3 /*break*/, 7];
                    tokens = updateLog.toString().split('\n');
                    matches = [/^FILENAME=/, /^DATE=/, /^SUCCESS=/, /^METHOD=/];
                    keys = ['fileName', 'date', 'success', 'method'];
                    try {
                        for (tokens_1 = __values(tokens), tokens_1_1 = tokens_1.next(); !tokens_1_1.done; tokens_1_1 = tokens_1.next()) {
                            str = tokens_1_1.value;
                            for (n in matches) {
                                reg = matches[n];
                                if (str.match(reg)) {
                                    str = str.replace(reg, '').trim();
                                    data[keys[n]] = str;
                                }
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (tokens_1_1 && !tokens_1_1.done && (_a = tokens_1.return)) _a.call(tokens_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    if ('true' === data.success)
                        data.success = 1;
                    else
                        data.success = 0;
                    if (!(!data.fileName && !data.date && !data.method)) return [3 /*break*/, 7];
                    // old update logs, for backwards compatibilty:
                    // - guess date from file's modification time
                    // - fix method
                    // - guess fileName from backup path
                    // - get success from legacy string
                    data = {};
                    return [4 /*yield*/, fs.statAsync(paths.update_log)];
                case 5:
                    stat = _b.sent();
                    data.date = stat.mtime;
                    data.method = 'make update (legacy)';
                    return [4 /*yield*/, file_manager.read_directory(paths.update_backup)];
                case 6:
                    dir = _b.sent();
                    if (dir && dir.length > 1)
                        data.fileName = dir[0];
                    if (-1 !== updateLog.indexOf('Update successful'))
                        data.success = 1;
                    else
                        data.success = -1; //unknown
                    _b.label = 7;
                case 7:
                    cmd = 'git -C ' + paths.Bela + ' describe --always --dirty';
                    child_process.exec(cmd, function (err, stdout, stderr) {
                        if (err) {
                            console.log('error executing: ' + cmd);
                        }
                        var ret = {
                            fileName: data.fileName,
                            date: data.date,
                            method: data.method,
                            success: data.success,
                            git_desc: stdout.trim(),
                            log: updateLog,
                        };
                        resolve(ret);
                    });
                    return [2 /*return*/];
            }
        });
    }); });
}
exports.get_bela_core_version = get_bela_core_version;
function get_bela_image_version() {
    return new Promise(function (resolve, reject) {
        return __awaiter(this, void 0, void 0, function () {
            var buffer, tokens, str, tokens_2, tokens_2_1, ret, e_3, e_4, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fs.readFileAsync('/etc/motd', 'utf8')];
                    case 1:
                        buffer = _b.sent();
                        if (!buffer) {
                            resolve('');
                            return [2 /*return*/];
                        }
                        tokens = buffer.toString().split('\n');
                        try {
                            for (tokens_2 = __values(tokens), tokens_2_1 = tokens_2.next(); !tokens_2_1.done; tokens_2_1 = tokens_2.next()) {
                                str = tokens_2_1.value;
                                if (str.match(/^Bela image.*/)) {
                                    ret = str.replace(/^Bela image, /, '');
                                    resolve(ret);
                                    return [2 /*return*/];
                                }
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (tokens_2_1 && !tokens_2_1.done && (_a = tokens_2.return)) _a.call(tokens_2);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        e_3 = _b.sent();
                        console.log("ERROR: ", e_3);
                        return [3 /*break*/, 3];
                    case 3:
                        resolve('');
                        return [2 /*return*/];
                }
            });
        });
    });
}
exports.get_bela_image_version = get_bela_image_version;
function get_xenomai_version() {
    if (globals.local_dev)
        return new Promise(function (resolve) { return resolve("3.0"); });
    return new Promise(function (resolve, reject) {
        child_process.exec('/usr/xenomai/bin/xeno-config --version', function (err, stdout, stderr) {
            if (err) {
                console.log('error reading xenomai version');
            }
            if (stdout.includes('2.6')) {
                paths.set_xenomai_stat('/proc/xenomai/stat');
            }
            else if (stdout.includes('3.0')) {
                paths.set_xenomai_stat('/proc/xenomai/sched/stat');
            }
            resolve(stdout);
        });
    });
}
exports.get_xenomai_version = get_xenomai_version;
function set_time(time) {
    if (globals.local_dev)
        return;
    child_process.exec('date -s "' + time + '"', function (err, stdout, stderr) {
        if (err || stderr) {
            console.log('error setting time', err, stderr);
        }
        else {
            console.log('time set to:', stdout);
        }
    });
}
exports.set_time = set_time;
function shutdown() {
    child_process.exec('shutdown -h now', function (err, stdout, stderr) { return console.log('shutting down', err, stdout, stderr); });
}
exports.shutdown = shutdown;
function board_detect() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (globals.local_dev)
                return [2 /*return*/, 'unknown'];
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    child_process.exec('board_detect', function (err, stdout, stderr) {
                        if (err)
                            stdout = 'unknown';
                        console.log('running on', stdout);
                        resolve(stdout);
                    });
                })];
        });
    });
}
exports.board_detect = board_detect;
process.on('warning', function (e) { return console.warn(e.stack); });
/*process.on('uncaughtException', err => {
    console.log('uncaught exception');
    throw err;
});
process.on('SIGTERM', () => {
    console.log('SIGTERM');
    throw new Error('SIGTERM');
});*/
