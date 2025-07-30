"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const jszip_1 = __importDefault(require("jszip"));
function activate(context) {
    context.subscriptions.push(vscode.window.registerCustomEditorProvider("lottieStudio.editor", new LottieViewerProvider(context), {
        // This option makes the webview persist even when it's in a background tab
        webviewOptions: { retainContextWhenHidden: true },
    }));
}
exports.activate = activate;
class LottieViewerProvider {
    context;
    constructor(context) {
        this.context = context;
    }
    async openCustomDocument(uri) {
        // For a readonly editor, we just need to return the URI
        return { uri, dispose: () => { } };
    }
    async resolveCustomEditor(document, webviewPanel, _token) {
        // 1. Set Webview Options
        webviewPanel.webview.options = {
            enableScripts: true,
            // **FIX:** Allow scripts to be loaded from the 'media' directory
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, "media"),
            ],
        };
        let animationJson = null;
        try {
            // 2. Read file content based on extension
            if (document.uri.fsPath.endsWith(".json")) {
                const raw = await vscode.workspace.fs.readFile(document.uri);
                animationJson = JSON.parse(Buffer.from(raw).toString("utf-8"));
            }
            else if (document.uri.fsPath.endsWith(".lottie")) {
                const data = await vscode.workspace.fs.readFile(document.uri);
                const zip = await jszip_1.default.loadAsync(data);
                // Find the first .json file in the zip archive
                const jsonFile = zip.file(/\.json$/i)[0];
                if (jsonFile) {
                    const content = await jsonFile.async("string");
                    animationJson = JSON.parse(content);
                }
                else {
                    vscode.window.showErrorMessage("Could not find a .json file inside the .lottie archive.");
                    return;
                }
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`Error parsing Lottie file: ${e}`);
            return;
        }
        // 3. Set the HTML content for the webview
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
        // 4. Send the animation data to the webview
        if (animationJson) {
            webviewPanel.webview.postMessage({ type: "load", data: animationJson });
        }
    }
    // in extension.ts
    // ... (keep the rest of the file the same) ...
    getHtmlForWebview(webview) {
        // Get the special URI for our local viewer script
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "viewer.js"));
        // **FIX:** Get the special URI for the LOCAL Lottie player script
        const lottiePlayerUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "lottie.min.js"));
        const nonce = getNonce();
        // **FIX:** The CSP is now simpler. It no longer needs the CDN URL.
        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lottie Viewer</title>
            
            <script nonce="${nonce}" src="${lottiePlayerUri}"></script>

            <style>
                body, html {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--vscode-editor-background);
                }
                #player {
                    max-width: 100%;
                    max-height: 100%;
                }
            </style>
        </head>
        <body>
            <div id="player"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
// A helper function to generate a random nonce string for CSP
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map