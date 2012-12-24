/*
 * The MIT License (MIT)
 * Copyright (c) 2012 Intel Corporation. All rights reserved.
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
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true, bitwise: true */
/*global define, brackets, $, window */

/**
 *
 */
define(function main(require, exports, module) {
    'use strict';


    var CommandManager = brackets.getModule("command/CommandManager"),
        Commands       = brackets.getModule("command/Commands"),
        FileUtils      = brackets.getModule("file/FileUtils"),
        LiveDevelopment = brackets.getModule("LiveDevelopment/LiveDevelopment"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        Inspector      = brackets.getModule
                            ("LiveDevelopment/Inspector/Inspector");

    var _styleTag;
    var _button;
    function _onFrameNavigated(event, res) {
        var elementsPanel,
            inspector,
            iframe = $('iframe');
        if (iframe.length === 0)
            return;
        inspector = iframe.contents()[0].defaultView.WebInspector;
        if (inspector && inspector.panels &&
            (elementsPanel = inspector.panels.elements)) {
            elementsPanel.performSearch(res.frame.url);
            setTimeout(function () {
                inspector.domAgent.searchResult(0, function (node) {
                    var treeOutline = elementsPanel.treeOutline;
                    var selectingNode = node && node.children[0];
                    if (!selectingNode) return;
                    elementsPanel.searchCanceled();
                    elementsPanel.selectDOMNode(selectingNode, true);
                    selectingNode.getChildNodes(function (children) {
                        if (children.length === 0)
                            return;
                        elementsPanel.selectDOMNode(children[0], true);
                        children[0].getChildNodes(function (grandChildren){
                            var selectingChild =
                                children[0].ownerDocument.body ||
                                children[0].ownerDocument.documentElement;
                            if (selectingChild) {
                                elementsPanel.selectDOMNode
                                    (selectingChild, true);
                            }
                        });
                    })
                })
            }, 1000);
        }
    }

    function load() {
        ExtensionUtils.loadLessFile(module, "main.less").done( function (node) {
            _styleTag = node;
            _button = $("<a>").text("Debug")
                .attr({ href: "#", id: "denniskehrig-v8live-button" })
                .insertBefore('#main-toolbar .buttons #toolbar-go-live')
                .click(function () {
                    var connected =  Inspector.connected();
                    LiveDevelopment.close();
                    if (connected && !Inspector.usingDevTool() || !connected) {
                        LiveDevelopment.open(true);
                    }
                })
        });
        $(Inspector.Page).on("frameNavigated.dev-tools", _onFrameNavigated)
        $(Inspector).on("connect", function () {
            _button.toggleClass("bridged", Inspector.usingDevTool());
        });
        $(Inspector).on("disconnect", function () {
            _button.toggleClass("bridged", false);
        });
    }

    function unload() {
        _styleTag.remove();
    }

    exports.load = load;
    exports.unload = unload;

    load();
});
