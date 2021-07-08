"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
set_Bela("/root/Bela/");
function set_Bela(new_path) {
    exports.Bela = (new_path.trim() + '/').replace(/\/\//, '/'); // ensure it ends with a trailing slash
    exports.webserver_root = exports.Bela + 'IDE/public/';
    exports.projects = exports.Bela + 'projects/';
    exports.uploads = exports.Bela + 'uploads/';
    exports.examples = exports.Bela + 'examples/';
    exports.libraries = exports.Bela + 'libraries/';
    exports.gui = exports.webserver_root + 'gui/';
    exports.exampleTempProject = exports.projects + 'exampleTempProject/';
    exports.media = exports.Bela + 'IDE/public/media/';
    exports.templates = exports.Bela + 'IDE/templates/';
    exports.ide_settings = exports.Bela + 'IDE/settings.json';
    exports.startup_env = '/opt/Bela/startup_env';
    exports.lockfile = exports.Bela + 'IDE/.lockfile';
    exports.xenomai_stat = '/proc/xenomai/sched/stat';
    exports.update = exports.Bela + 'updates/';
    exports.update_backup = exports.Bela + '../_BelaUpdateBackup/updates/';
    exports.update_log = exports.Bela + '../update.log';
    exports.tmp = "/tmp/";
}
exports.set_Bela = set_Bela;
;
function set_xenomai_stat(new_path) { exports.xenomai_stat = new_path; }
exports.set_xenomai_stat = set_xenomai_stat;
;
