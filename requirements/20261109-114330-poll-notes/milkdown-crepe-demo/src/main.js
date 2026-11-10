import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import './style.css';

const STORAGE_KEY = 'milkdown-crepe-vanilla-demo-notes';
const initialMarkdown = `# Meeting notes\n\nThis is an example of **bold text**, *italic text*, and a [link](https://milkdown.dev/).\n\n## Things to do\n\n- Review the design\n- Update the documentation\n- Share the notes with the team\n\nClick **Edit notes** to see the traditional formatting toolbar.`;
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
const $ = (selector) => document.querySelector(selector);
const viewer = $('#viewer');
const editorRoot = $('#editor');
const editBtn = $('#edit-btn');
const saveBtn = $('#save-btn');
const cancelBtn = $('#cancel-btn');
const markdownOutput = $('#markdown-output');
const savedIndicator = $('#saved-indicator');
let savedMarkdown = localStorage.getItem(STORAGE_KEY) ?? initialMarkdown;
let crepe = null;

function renderViewer() {
  viewer.innerHTML = DOMPurify.sanitize(md.render(savedMarkdown));
  markdownOutput.textContent = savedMarkdown;
  savedIndicator.textContent = 'Saved locally';
}

async function startEditing() {
  editBtn.hidden = true;
  viewer.hidden = true;
  editorRoot.hidden = false;
  cancelBtn.hidden = false;
  saveBtn.hidden = false;
  savedIndicator.textContent = 'Editing';

  try {
    crepe = new Crepe({
      root: editorRoot,
      defaultValue: savedMarkdown,
      features: {
        [Crepe.Feature.TopBar]: true,
        [Crepe.Feature.Toolbar]: true,
      },
    });
    await crepe.create();
  } catch (error) {
    console.error('Could not initialize Milkdown Crepe:', error);
    alert('Could not initialize the editor. See the browser console.');
    closeEditor();
  }
}

function closeEditor() {
  if (crepe) {
    crepe.destroy();
    crepe = null;
  }
  editorRoot.replaceChildren();
  editorRoot.hidden = true;
  viewer.hidden = false;
  editBtn.hidden = false;
  cancelBtn.hidden = true;
  saveBtn.hidden = true;
  renderViewer();
}

editBtn.addEventListener('click', startEditing);
cancelBtn.addEventListener('click', closeEditor);
saveBtn.addEventListener('click', () => {
  if (!crepe) return;
  savedMarkdown = crepe.getMarkdown();
  localStorage.setItem(STORAGE_KEY, savedMarkdown);
  closeEditor();
});

renderViewer();
