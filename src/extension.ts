import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "lottieStudio.editor",
      new LottieViewerProvider(context),
      {
        // This option makes the webview persist even when it's in a background tab
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );
}

class LottieViewerProvider implements vscode.CustomReadonlyEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
    // For a readonly editor, we just need to return the URI
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // 1. Set Webview Options
    webviewPanel.webview.options = {
      enableScripts: true,
      // **FIX:** Allow scripts to be loaded from the 'media' directory
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
      ],
    };

    let animationJson: any = null;

    try {
      // 2. Read file content based on extension
      if (document.uri.fsPath.endsWith(".json")) {
        const raw = await vscode.workspace.fs.readFile(document.uri);
        animationJson = JSON.parse(Buffer.from(raw).toString("utf-8"));
      } else if (document.uri.fsPath.endsWith(".lottie")) {
        const data = fs.readFileSync(document.uri.fsPath);
        const zip = await JSZip.loadAsync(data);

        console.log("Files in zip:", Object.keys(zip.files));

        // Collect all JSON files in the zip
        const jsonFiles = Object.keys(zip.files).filter((name) =>
          name.endsWith(".json")
        );

        if (jsonFiles.length === 0) {
          vscode.window.showErrorMessage(
            "No JSON animation found in .lottie file."
          );
          return;
        }

        // Try to find the best candidate
        let selectedFile = jsonFiles[0];

        // Prefer files under folders that contain 'anim' in name (like animations/, anim/, etc.)
        const preferred = jsonFiles.find((name) => /anim/i.test(name));
        if (preferred) {
          selectedFile = preferred;
        }

        console.log("Loading animation JSON:", selectedFile);

        const entry = zip.file(selectedFile);
        if (!entry) {
          vscode.window.showErrorMessage(
            "Could not load animation JSON from .lottie file."
          );
          return;
        }

        const content = await entry.async("string");
        animationJson = JSON.parse(content);
      }
    } catch (e) {
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

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "viewer.js")
    );

    const lottiePlayerUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "lottie.min.js")
    );

    const nonce = getNonce();

    const jszipUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "jszip.min.js")
    );

    return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lottie Viewer</title>
<script nonce="${nonce}" src="${lottiePlayerUri}"></script>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: sans-serif;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  #controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    box-sizing: border-box;
    z-index: 10;
  }
  #controls button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }
  #controls button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  #controls label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
  }
  #controls input[type="range"] {
    width: 100px;
  }
  #controls input[type="color"] {
    width: 24px;
    height: 24px;
    border: none;
    cursor: pointer;
  }
  #playerContainer {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  #player {
    width: 100%;
    max-width: 500px;
    max-height: 500px;
    border-radius: 8px;
    background: var(--vscode-editor-background);
  }
    #timeline {
  position: relative;
  height: 24px;
  width: 100%;
  background: #656565ff;
  margin-top: 8px;
  border-radius: 4px;
  cursor: pointer;
}
#progressBar {
  height: 100%;
  width: 0%;
  background: var(--vscode-button-background);
  border-radius: 4px;
}
#scrubThumb {
  position: absolute;
  top: 0;
  width: 6px;
  height: 100%;
  background: var(--vscode-editor-foreground);
  border-radius: 2px;
  transform: translateX(-50%);
}
#framePreview {
  position: absolute;
  bottom: 30px;
  left: 100px;
  display: none;
  border: 1px solid var(--vscode-editorWidget-border);
  background: #fff;
  z-index: 10;
}

</style>
</head>
<body>
  <div id="playerContainer">
    <div id="player"></div>
  </div>
  <div id="controls">
    <button id="playPauseBtn">Play</button>
    <button id="restartBtn">Restart</button>
    <button id="loopToggleBtn">Loop: On</button>
    <label>Speed: 
      <input type="range" id="speedSlider" min="0.1" max="3" step="0.1" value="1">
      <span id="speedValue">1x</span>
    </label>
    <label>Seek:
      <input type="range" id="seekSlider" min="0" max="100" value="0">
    </label>
    <label>Background:
      <input type="color" id="bgColorPicker" value="#ffffff">
    </label>
    <button id="themeToggleBtn">Theme</button>
    <button id="exportBtn">Export JSON</button>
      <button id="zoomInBtn">＋</button>
  <button id="zoomOutBtn">－</button>
  <button id="fitBtn">Fit</button>
  <div id="timeline">
  <div id="progressBar"></div>
  <div id="scrubThumb"></div>
  <canvas id="framePreview" width="60" height="60"></canvas>
</div>
<button id="saveLottieBtn">Save as .lottie</button>

<div id="fpsCounter" style="margin-top:4px;font-size:12px;">FPS: --</div>
  </div>


  <script nonce="${nonce}" src="${scriptUri}"></script>
  <script nonce="${nonce}" src="${lottiePlayerUri}"></script>
<script nonce="${nonce}" src="${jszipUri}"></script>
<script nonce="${nonce}" src="${scriptUri}"></script>

</body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
