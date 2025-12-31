import * as vscode from 'vscode';

/**
 * WebviewViewProvider for the AI App Builder sidebar panel
 * Embeds the Next.js panel directly in VS Code's sidebar
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiAppBuilder.panel';
  private _view?: vscode.WebviewView;
  private _port: number;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    port: number
  ) {
    this._port = port;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'openExternal':
          vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:${this._port}`));
          break;
        case 'refresh':
          webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
          break;
      }
    });
  }

  public updatePort(port: number) {
    this._port = port;
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const panelUrl = `http://127.0.0.1:${this._port}`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI App Builder</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
    }
    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .toolbar {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: var(--vscode-sideBar-background);
      border-bottom: 1px solid var(--vscode-sideBar-border);
    }
    .toolbar button {
      padding: 4px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .toolbar button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-charts-green);
    }
    .status-dot.disconnected {
      background: var(--vscode-charts-red);
    }
    iframe {
      flex: 1;
      width: 100%;
      border: none;
      background: var(--vscode-editor-background);
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
      color: var(--vscode-foreground);
    }
    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--vscode-progressBar-background);
      border-top-color: var(--vscode-button-background);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-message {
      text-align: center;
      padding: 20px;
      color: var(--vscode-errorForeground);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <button onclick="refresh()">↻ Refresh</button>
      <button onclick="openExternal()">↗ Open in Browser</button>
      <div class="status">
        <span class="status-dot" id="statusDot"></span>
        <span id="statusText">Connecting...</span>
      </div>
    </div>
    <iframe 
      id="panel" 
      src="${panelUrl}"
      onload="onFrameLoad()"
      onerror="onFrameError()"
    ></iframe>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const iframe = document.getElementById('panel');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    function refresh() {
      iframe.src = iframe.src;
      statusText.textContent = 'Refreshing...';
    }

    function openExternal() {
      vscode.postMessage({ type: 'openExternal' });
    }

    function onFrameLoad() {
      statusDot.classList.remove('disconnected');
      statusText.textContent = 'Connected';
    }

    function onFrameError() {
      statusDot.classList.add('disconnected');
      statusText.textContent = 'Connection failed';
    }

    // Check connection status periodically
    setInterval(async () => {
      try {
        const response = await fetch('${panelUrl}/api/health', { mode: 'no-cors' });
        statusDot.classList.remove('disconnected');
        statusText.textContent = 'Connected';
      } catch (e) {
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
      }
    }, 5000);
  </script>
</body>
</html>`;
  }
}
