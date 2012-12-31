/* * The MIT License (MIT)
 * Copyright (c) 2012 Dennis Kehrig. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, forin: true, maxerr: 50, regexp: true */
/*global define, brackets, $, less, io */


/**
 *
 */
define(function main(require, exports, module) {
    'use strict';

    // --- Required modules ---

    // Document Manager
    var CommandManager = brackets.getModule("command/CommandManager"),
        Commands       = brackets.getModule("command/Commands"),
        FileUtils      = brackets.getModule("file/FileUtils"),
        LiveDevelopment = brackets.getModule("LiveDevelopment/LiveDevelopment"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        Inspector      = brackets.getModule("LiveDevelopment/Inspector/Inspector");

    // <style> tag containing CSS code compiled from LESS
    var _$styleTag;
    // The toolbar button
    var _$button;
    /** Loads a less file as CSS into the document */
    var _$debugging = false;
    var _deviceSelect;

    function _loadLessFile(file, dir) {
        var result = $.Deferred();

        // Load the Less code
        $.get(dir + file, function (code) {
            // Parse it
            var parser = new less.Parser({ filename: file, paths: [dir] });
            parser.parse(code, function onParse(err, tree) {
                console.assert(!err, err);
                // Convert it to CSS and append that to the document head
                $("<style>").text(tree.toCSS()).appendTo(window.document.head);
                result.resolve();
            });
        });

        return result.promise();
    }

    /** Find this extension's directory relative to the brackets root */
    function _extensionUrl() {
        var path = FileUtils.getNativeModuleDirectoryPath(module) + "/";
        if (path[0] !== "/" && path[1] === ":")
            //We are on Windows
            return "file:///" + path.replace(/\\/g, "/")
        else
            return "file://" + path;
    }

    /** Handles clicks of the V8 toolbar button */
    function _onButtonClicked() {
        if (Inspector.connected()) {
            LiveDevelopment.close();
            _$debugging = false;
        }
        else {
            _$debugging = true;
            CommandManager.execute(Commands.FILE_LIVE_FILE_PREVIEW, true);
        }
    }
    // --- Loaders and Unloaders ---

    function _loadStyle() {
        return _loadLessFile("main.less", _extensionUrl()).done(function ($node) {
            _$styleTag = $node;
        });
    }

    function _unloadStyle() {
        _$styleTag.remove();
    }

    function _loadSelect() {
        var result = new $.Deferred();
        _loadStyle().done(function () {
            _deviceSelect = $("<select id='devices'><option value='Simulator'>Simulator</option></select>")
                                    .change(function() {
                                        $("option:selected", this).each(function () {
                                            var inspectorJson = "Inspector.json";
                                            var realDeviceUrlMapper = function (url) {
                                                    var encodedDocPath = encodeURI(url);
                                                    var encodedProjectPath = encodeURI(ProjectManager.getProjectRoot().fullPath);
                                                    return url.replace(new RegExp("file:/{2,3}" + encodedProjectPath), "file:///opt/usr/apps/" + ProjectManager.getProjectId() + "/res/wgt/");
                                                };
                                            window.device = $(this).val();
                                            Inspector.setSocketsGetter(null);
                                            if (window.device !== "Simulator") {
                                                LiveDevelopment.addUrlMapper(realDeviceUrlMapper);
                                                inspectorJson = "Inspector_old.json";
                                            }
                                            else 
                                                LiveDevelopment.removeUrlMapper(realDeviceUrlMapper);
                                            Inspector.setInspectorJson(inspectorJson).done( function () {
                                                if (Inspector.connected()) {
                                                    LiveDevelopment.close();
                                                    LiveDevelopment.open(Inspector.usingDevTool());
                                                }
                                            });
                                       
                                        })
                                    });
            window.device = "Simulator";
            ProjectManager.setBaseUrl("");
            child_process.exec('sdb devices',function(err, stdout, stderr) {
                stdout.split("\n").forEach (function (device) {
                    var deviceInfo = device.split("\t");
                    if (deviceInfo.length === 3)
                        _deviceSelect.append($("<option value='" + deviceInfo[0] + "'>" + deviceInfo[2] + "</option>"));
                    var projectId = ProjectManager.getProjectId(),
                        deviceBaseDir = "/opt/usr/apps/" + projectId + "/res/wgt/";
                    $(LiveDevelopment).on("liveHTMLSaved", function (event, doc) {
                        execDeviceCommand("push " + doc.file.fullPath + " " + deviceBaseDir, function () {
                            Inspector.Page.reload();
                        });
                });
                })
            });
            _deviceSelect.insertBefore('#main-toolbar .buttons :first-child');
            result.resolve();
        }).fail(result.reject);

        return result.promise();
    }

    function load() {
        _loadSelect();
        $(ProjectManager).on("projectOpen", function (projectRoot) {
            if (window.device !== "Simulator") {
                var projectId = ProjectManager.getProjectId(),
                    deviceBaseDir = "/opt/usr/apps/" + projectId + "/res/wgt/";
                
                ProjectManager.setBaseUrl("file://" + deviceBaseDir);
            }
        });
    }

    function unload() {
    }


    // --- Exports ---

    exports.load = load;
    exports.unload = unload;


    // --- Initializiation ---

    load();
});
