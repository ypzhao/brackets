var gui = require('nw.gui');
var child_process = require('child_process');
var liveBrowser;
var ports = {};
var nodeFs = require('fs');
$.extend(true, brackets.fs, nodeFs , {
    stat: function (path, callback) {
        if (path.indexOf("dropbox://") === 0) {

        }
        else  {
            nodeFs.stat(path, function (err, stats) {
                if (!err) {
                    err = brackets.fs.NO_ERROR; 
                }
                if (err && err.ENOENT) {
                    err = brackets.fs.NOT_FOUND_ERR;
                }
                callback(err, stats, new Date());
            });
        }
    },
    readdir: function (path, callback ) {
        if (path.indexOf("dropbox://") === 0) {
        }
        else 
            nodeFs.readdir(path, callback);
    }
});
var execDeviceCommand = function (cmd, callback) {
    console.log("cmd:" +  cmd);
    child_process.exec("sdb -s " + window.device + " " + cmd, callback);
};
function ShowOpenDialog ( callback, allowMultipleSelection, chooseDirectories,
                title, initialPath, fileTypes) {
    var file = $("<input type='file'/>");
    if (chooseDirectories)
        file.attr("nwdirectory", true);
    if (allowMultipleSelection)
        file.attr("multiple", true);
    file.click().change(function(evt) {
        var files = [];
        for (var i = 0; i < this.files.length; ++i)
          files.push(this.files[i].path.replace(/\\/g, "/"));
       
        callback(0, files);
    });
} 
(function() {
    var fs = brackets.fs,
        requestFile = process.cwd() + '/request',
        responseFile = process.cwd() + '/response';

    if (!fs.existsSync(requestFile))
        fs.closeSync(fs.openSync(requestFile, "w"));
    fs.watch(requestFile, function (event, filename) {
        var Inspector = require("LiveDevelopment/Inspector/Inspector");
        console.log('event is: ' + event);
        if (filename) {
            console.log('filename provided: ' + filename);
        } else {
            console.log('filename not provided');
        }
        var request = fs.readFileSync(requestFile, "ascii");
        console.log("request:", request);
        if ( request === "disconnect") {
            console.log("try to disconnect inspector");
            if (Inspector.connected()) {
                Inspector.on("disconnect", function () {
                    fs.writeFileSync(responseFile, "disconnected", "ascii");
                });
                Inspector.disconnect();
            }
            else
                fs.writeFileSync(responseFile, "disconnected", "ascii");
            fs.writeFileSync(requestFile, "", "ascii");
       }
    })
})();
function ReadDir(){
    throw arguments.callee.name
}
function MakeDir(){
    throw arguments.callee.name
}
function Rename(){
    throw arguments.callee.name
}
function GetFileModificationTime(){
    return process.uptime() * 1000;
}
function QuitApplication(){
    gui.App.Quit();
}
function AbortQuit(){
    throw arguments.callee.name
}
function ShowDeveloperTools(){
    gui.Window.get().showDevTools();
}
function ReadFile(){
    throw arguments.callee.name
}
function WriteFile(){
    throw arguments.callee.name
}
function SetPosixPermissions(){
    throw arguments.callee.name
}
function DeleteFileOrDirectory(){
    throw arguments.callee.name
}
function GetElapsedMilliseconds(){
    return process.uptime() * 1000;
}
function OpenLiveBrowser(callback, url, enableRemoteDebugging){
    // enableRemoteDebugging flag is ignored on mac
    if (window.device && window.device !== "Simulator") {
        var ProjectManager = require("project/ProjectManager");
        var projectRoot = ProjectManager.getProjectRoot();
        var projectName = projectRoot.name;
        var projectId = ProjectManager.getProjectId();
        process.chdir(projectRoot.fullPath);
        console.log("dir changed to " + projectRoot.fullPath);
        if (brackets.fs.existsSync(projectName + ".wgt"))
            brackets.fs.unlinkSync(projectName + ".wgt");
        child_process.exec("web-packaging", function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            execDeviceCommand("shell mdkir -p /opt/apps/widgets/test-widgets", function () {
            execDeviceCommand("push " + projectName + ".wgt /tmp/"+ projectName + ".wgt", function(err, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
                //execDeviceCommand("shell '/usr/bin/wrt-launcher --developer-mode 1 && wrt-installer -iu /opt/apps/widgets/test-widgets/" + projectName + ".wgt && /usr/bin/wrt-launcher --start " + projectId + " --debug --timeout=90'", function (err, stdout, stderr) {
                execDeviceCommand("shell 'unzip -p /tmp/" + projectName + ".wgt > t && unzip -p /opt/usr/apps/widgets/test-widgets/" + projectName + ".wgt> t1 && if [ " + ports[window.device + "." + projectId] + " == undefined ] || ! diff t t1 >/dev/null  ; then cp /tmp/" + projectName + ".wgt" + " /opt/usr/apps/widgets/test-widgets && /usr/bin/wrt-launcher --developer-mode 1 && pkgcmd -s -n " + projectId + " -t wgt && pkgcmd -u -n " + projectId +  " -q -t wgt; pkgcmd -i -q -t wgt -p /opt/apps/widgets/test-widgets/" + projectName + ".wgt && /usr/bin/wrt-launcher --start " + projectId + " --debug --timeout=90 ; else echo port: " + ports[window.device + "." + projectId] + "; fi'", function (err, stdout, stderr) {
                    console.log("got stdout:" + stdout.split("\n").length);
                    stdout.split("\n").forEach (function (line) {
                        console.log("line:" + line);
                        if (line.indexOf("port:") !== -1) {
                            var port = line.split(" ")[1];
                            var Inspector = require("LiveDevelopment/Inspector/Inspector");
                            console.log("got port:" + port);
                            ports[ window.device + "." + projectId ] = port;
                            Inspector.setSocketsGetter(function () {
                                var result = new $.Deferred();
                                console.log("setting up forward " + port);
                                child_process.exec("sdb -s " + window.device + " forward tcp:" + port + " tcp:" + port, function() {
                                    console.log("getting debug url:" + port);
                                    $.getJSON("http://localhost:" + port + "/WidgetDebug", function (data) {
                                        console.log("got debug url:" + data.inspector_url);
                                        result.resolve ([{
                                            webSocketDebuggerUrl:"ws://localhost:" + port +"/devtools/page/1",
                                            url:url,
                                            devtoolsFrontendUrl: "/" + data.inspector_url
                                        }]);
                                    });
                                });
                                return result;
                            });
                            callback(0, port)
                        }
                    })

                });
            });
            });
        })
        return;
    }
    setTimeout(function() {
        var args = [];
        var newHeight = screen.availHeight/2;
        var nwWindow = gui.Window.get();
        var simulatorPath, questionMarkIndex;
        if (enableRemoteDebugging) {
            args.push('--remote-debugging-port=9222');
            args.push('--no-toolbar');
        }
        questionMarkIndex =  url.indexOf("?");
        simulatorPath = url.substr(0, questionMarkIndex);
        simulatorPath = simulatorPath.slice(7);
        simulatorPath = simulatorPath.substr(0, simulatorPath.lastIndexOf("/"));
        if (simulatorPath && brackets.platform === "win" && simulatorPath.charAt(0) === "/") {
            simulatorPath = simulatorPath.slice(1);
        }
        var NativeFileSystem = require("file/NativeFileSystem").NativeFileSystem;
        (new NativeFileSystem.DirectoryEntry(simulatorPath)).getFile(simulatorPath + "/package.json", {create: true}, function (fileEntry) {
            var packageJson = {
                name: "Brackets",
                main: url
            }
            require("file/FileUtils").writeText(fileEntry, JSON.stringify(packageJson));
            args.push(simulatorPath);
            liveBrowser = child_process.spawn(process.execPath, args);
            liveBrowser.on('close', function () {
                liveBrowser = null;
            });
            nwWindow.on('close', function() {
                appshell.app.closeLiveBrowser();
                nwWindow.close(true);
            });
            //Ubuntu 11.10 Unity env
            if ((process.env["XDG_CURRENT_DESKTOP"] && process.env["XDG_CURRENT_DESKTOP"] === "Unity")
                //Ubuntu 11.04 Unity env
                || process.env["DESKTOP_SESSION"] === "gnome")
                newHeight -= (window.outerHeight - window.innerHeight);
            window.resizeTo(window.outerWidth, newHeight);
            nwWindow.moveTo((screen.availWidth - window.outerWidth)/2,
                 screen.availTop + screen.availHeight/2);
            callback(liveBrowser.pid > 0 ? 0: -1, liveBrowser.pid)
        })

    }, 0);
}
function CloseLiveBrowser(callback){
    if (callback && liveBrowser) {
        liveBrowser.on('close', function () {
            callback(0);
        });
    }
    else if (callback)
        callback(-1);
    if (liveBrowser)
        process.kill(liveBrowser.pid, "SIGTERM");
}
function OpenURLInDefaultBrowser(){
    throw arguments.callee.name
}
function GetCurrentLanguage(){
    return navigator.language
}
function GetApplicationSupportDirectory(){
    var groupName = "Adobe",
        appName = "Brackets";
    if (process.platform === "win32")
        return process.env["APPDATA"]+ "\\" + groupName + "\\" + appName;
    else
        return process.env["HOME"]+"/Library/Application Support/"+ groupName
                   + "/" + appName;
}
function ShowOSFolder(){
    throw arguments.callee.name
}
window.require = undefined
