'use strict';

const vscode = require('vscode');
const path = require('path');
const { homedir } = require('os');
const { stat } = require('fs').promises;
const { readHtml, writeFile, getSettings } = require('./util');

const getConfig = () => {
  const editorSettings = getSettings('editor', ['fontLigatures', 'tabSize']);
  const editor = vscode.window.activeTextEditor;
  if (editor) editorSettings.tabSize = editor.options.tabSize;

  const extensionSettings = getSettings('codesnap', [
    'backgroundColor',
    'boxShadow',
    'containerPadding',
    'roundedCorners',
    'showWindowControls',
    'showWindowTitle',
    'showLineNumbers',
    'realLineNumbers',
    'transparentBackground',
    'target',
    'shutterAction',
    'saveDirectory'
  ]);

  const selection = editor && editor.selection;
  const startLine = extensionSettings.realLineNumbers ? (selection ? selection.start.line : 0) : 0;

  let windowTitle = '';
  if (editor && extensionSettings.showWindowTitle) {
    const activeFileName = editor.document.uri.path.split('/').pop();
    windowTitle = `${vscode.workspace.name} - ${activeFileName}`;
  }

  return {
    ...editorSettings,
    ...extensionSettings,
    startLine,
    windowTitle
  };
};

const createPanel = async (context) => {
  const panel = vscode.window.createWebviewPanel(
    'codesnap',
    'CodeSnap 📸',
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(context.extensionPath)]
    }
  );
  panel.webview.html = await readHtml(
    path.resolve(context.extensionPath, 'webview/index.html'),
    panel
  );

  return panel;
};

let lastUsedImageUri = vscode.Uri.file(path.resolve(homedir(), 'Desktop/code.png'));
const saveImage = async (data, config) => {
  const { saveDirectory } = config;
  if (saveDirectory) {
    try {
      const stats = await stat(saveDirectory);
      if (stats.isDirectory()) {
        const fileName = `codesnap-${Date.now()}.png`;
        const filePath = path.join(saveDirectory, fileName);
        await writeFile(filePath, Buffer.from(data, 'base64'));
        vscode.window.showInformationMessage(`Image saved to ${filePath}`);
        return;
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        vscode.window.showWarningMessage(`Directory not found: ${saveDirectory}. Please select a location to save.`);
      } else {
        vscode.window.showErrorMessage(`Error accessing directory: ${err.message}`);
      }
    }
  }

  const uri = await vscode.window.showSaveDialog({
    filters: { Images: ['png'] },
    defaultUri: lastUsedImageUri
  });
  if (uri) {
    lastUsedImageUri = uri;
    await writeFile(uri.fsPath, Buffer.from(data, 'base64'));
  }
};

const hasOneSelection = (selections) =>
  selections && selections.length === 1 && !selections[0].isEmpty;

const runCommand = async (context) => {
  const panel = await createPanel(context);
  let config;

  const update = async () => {
    await vscode.commands.executeCommand('editor.action.clipboardCopyWithSyntaxHighlightingAction');
    config = getConfig();
    panel.webview.postMessage({ type: 'update', ...config });
  };

  const flash = () => panel.webview.postMessage({ type: 'flash' });

  panel.webview.onDidReceiveMessage(async ({ type, data }) => {
    if (type === 'save') {
      flash();
      await saveImage(data, config);
    } else {
      vscode.window.showErrorMessage(`CodeSnap 📸: Unknown shutterAction "${type}"`);
    }
  });

  const selectionHandler = vscode.window.onDidChangeTextEditorSelection(
    (e) => hasOneSelection(e.selections) && update()
  );
  panel.onDidDispose(() => selectionHandler.dispose());

  const editor = vscode.window.activeTextEditor;
  if (editor && hasOneSelection(editor.selections)) update();
};

module.exports.activate = (context) =>
  context.subscriptions.push(
    vscode.commands.registerCommand('codesnap.start', () => runCommand(context))
  );
