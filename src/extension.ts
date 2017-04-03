'use strict';

import * as path from "path";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vs from 'vscode';

const pug2html = 'pug2html'
const pug2htmlUri = vs.Uri.parse(`${pug2html}://preview.html`);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vs.ExtensionContext) {

    let provider = new Pug2HtmlContentProvider();
    let registration = vs.workspace.registerTextDocumentContentProvider(pug2html, provider);

    vs.workspace.onDidChangeTextDocument((e: vs.TextDocumentChangeEvent) => {
        let doc = vs.window.activeTextEditor.document
        if (e.document !== doc) return
        if (doc.uri.scheme === pug2html) return
        if (["", "pug", "jade"].indexOf(doc.languageId) == -1) return
        provider.update(pug2htmlUri);
    });
    
    vs.window.onDidChangeTextEditorSelection((e: vs.TextEditorSelectionChangeEvent) => {
        let doc = vs.window.activeTextEditor.document
        if (e.textEditor !== vs.window.activeTextEditor) return
        if (doc.uri.scheme === pug2html) return
        if (["", "pug", "jade"].indexOf(doc.languageId) == -1) return
        provider.update(pug2htmlUri);
    })

    let disposable = vs.commands.registerCommand('extension.execute', () => {
        vs.commands.executeCommand('vscode.open', pug2htmlUri, getPreviewColumn(), 'preview.html').then(() => {
            // OK
        }, (reason) => {
            vs.window.showErrorMessage(reason);
        })
    });

    context.subscriptions.push(disposable, registration);
}

export function deactivate() {
}

function getPreviewColumn() {
    let displayColumn: vs.ViewColumn;
    let currentColumn = vs.window.activeTextEditor.viewColumn 
    if (currentColumn === vs.ViewColumn.One) {
        return vs.ViewColumn.Two
    }
    return vs.ViewColumn.Three
}

class Pug2HtmlContentProvider implements vs.TextDocumentContentProvider {
    private didChange = new vs.EventEmitter<vs.Uri>();

    public provideTextDocumentContent(uri: vs.Uri): string {
        return this.compileContent()
    }

    get onDidChange(): vs.Event<vs.Uri> {
        return this.didChange.event;
    }

    public update(uri: vs.Uri) {
        this.didChange.fire(uri)
    }
    
    private compileContent() {
        let doc = vs.window.activeTextEditor.document
        
        let text = doc.getText()
        let pug = this.findPug()
        if (!pug) {
            vs.window.showErrorMessage("Pug ist not installed.");
            return ""
        }
        try {
            let co = this.compileOptions(doc.fileName)
            co.filename = co.filename || doc.fileName
            return pug.compile(text, co)({})
        } catch (error) {
            return error.message
        }
    }

    private findPug() {
        try {
            let pugPath = path.join(vs.workspace.rootPath, "node_modules", "pug")
            return require(pugPath)            
        } catch (error) {
                
        }
        try {
            return require("pug")            
        } catch (error) {
            
        }
        return null
    }

    private compileOptions(fileName) {
        let settings = vs.workspace.getConfiguration(pug2html)
        let co = settings.get<any>("compileOptions", {
            doctype: "html",
            pretty: true
        })
        let cop = settings.get<string>("compileOptionsPath", null)
        if (!cop) {
            return co
        }
        cop = path.join(vs.workspace.rootPath, cop)
        try {
            co = require(cop)
            if (typeof co === "function") {
                co = co(fileName)
            }            
        } catch (error) {
            console.log(error.message)
        }

        return co || {}
    }
}