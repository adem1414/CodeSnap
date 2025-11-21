import { pasteCode } from './code.js';
import { cameraFlashAnimation, takeSnap } from './snap.js';
import { $, setVar } from './util.js';

const navbarNode = $('#navbar');
const windowControlsNode = $('#window-controls');
const windowTitleNode = $('#window-title');
const btnSave = $('#save');
// 🔥 mes ajouts
const btnCopy = $('#codesnap-copy');
const btnDownload = $('#codesnap-download');

const btnEdit = $('#codesnap-edit');
const editingButtons = $('#codesnap-editing-buttons');
const btnUnderline = $('#codesnap-underline');
const btnHighlight = $('#codesnap-highlight');
const snippetNode = $('#snippet');

let isEditing = false;

btnEdit.addEventListener('click', () => {
    isEditing = !isEditing;
    snippetNode.contentEditable = isEditing;
    editingButtons.style.display = isEditing ? 'flex' : 'none';
    btnEdit.textContent = isEditing ? 'Disable Editing' : 'Enable Editing';
    if (isEditing) {
        snippetNode.focus();
    }
});

btnUnderline.addEventListener('click', () => {
    if (isEditing) {
        document.execCommand('underline', false, null);
    }
});

btnHighlight.addEventListener('click', () => {
    if (isEditing) {
        document.execCommand('hiliteColor', false, '#fceb3c');
    }
});

let config;

const snap = (action) => () => {
  if (config) takeSnap({ ...config, shutterAction: action });
};

// bouton Copy -> déclenche une capture avec action copy
btnCopy?.addEventListener('click', snap('copy'));

// bouton Save -> déclenche une capture avec action save/download
btnDownload?.addEventListener('click', snap('save'));

btnSave.addEventListener('click', () => {
  if (config) takeSnap(config);
});

document.addEventListener('copy', () => takeSnap({ ...config, shutterAction: 'copy' }));

document.addEventListener('paste', (e) => pasteCode(config, e.clipboardData));

window.addEventListener('message', ({ data: { type, ...cfg } }) => {
  if (type === 'update') {
    config = cfg;

    const {
      fontLigatures,
      tabSize,
      backgroundColor,
      boxShadow,
      containerPadding,
      roundedCorners,
      showWindowControls,
      showWindowTitle,
      windowTitle
    } = config;

    setVar('ligatures', fontLigatures ? 'normal' : 'none');
    if (typeof fontLigatures === 'string') setVar('font-features', fontLigatures);
    setVar('tab-size', tabSize);
    setVar('container-background-color', backgroundColor);
    setVar('box-shadow', boxShadow);
    setVar('container-padding', containerPadding);
    setVar('window-border-radius', roundedCorners ? '4px' : 0);

    navbarNode.hidden = !showWindowControls && !showWindowTitle;
    windowControlsNode.hidden = !showWindowControls;
    windowTitleNode.hidden = !showWindowTitle;

    windowTitleNode.textContent = windowTitle;

    document.execCommand('paste');
  } else if (type === 'flash') {
    cameraFlashAnimation();
  }
});
