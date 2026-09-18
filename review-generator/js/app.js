import { GOOGLE_REVIEW_URL, BUSINESS_NAME } from './config.js';
import { generateUniqueReview } from './generator/index.js';
import {
  getOrCreateVisitorId,
  loadSessionHistory,
} from './generator/visitor.js';

const draftInput = document.getElementById('draft-input');
const generateBtn = document.getElementById('btn-generate');
const editBtn = document.getElementById('btn-edit');
const copyBtn = document.getElementById('btn-copy');
const googleBtn = document.getElementById('btn-google');
const toast = document.getElementById('toast');

let sessionHistory = loadSessionHistory();
let isEditing = false;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function setDraft(text) {
  draftInput.value = text;
}

function setReadOnly(readonly) {
  draftInput.readOnly = readonly;
  isEditing = !readonly;
  editBtn.textContent = readonly ? 'Edit Review' : 'Done Editing';
}

async function loadUniqueDraft() {
  generateBtn.disabled = true;
  editBtn.disabled = true;
  copyBtn.disabled = true;
  googleBtn.disabled = true;

  try {
    const visitorId = getOrCreateVisitorId();
    const result = await generateUniqueReview({
      visitorId,
      history: sessionHistory,
    });
    sessionHistory = result.history ?? sessionHistory;
    setDraft(result.draft);
    setReadOnly(true);
  } catch (err) {
    console.error(err);
    showToast('Could not generate draft. Try again.');
  } finally {
    generateBtn.disabled = false;
    editBtn.disabled = false;
    copyBtn.disabled = false;
    googleBtn.disabled = false;
  }
}

function handleEdit() {
  if (isEditing) {
    setReadOnly(true);
    showToast('Draft updated locally.');
    return;
  }
  setReadOnly(false);
  draftInput.focus();
  draftInput.setSelectionRange(draftInput.value.length, draftInput.value.length);
}

async function handleCopy() {
  const text = draftInput.value.trim();
  if (!text) {
    showToast('Nothing to copy yet.');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('Review copied.');
  } catch {
    draftInput.focus();
    draftInput.select();
    document.execCommand('copy');
    showToast('Review copied.');
  }
}

function handleGoogleReview() {
  const url = GOOGLE_REVIEW_URL.trim();
  if (!url || url.includes('PASTE_MY_GOOGLE_REVIEW_LINK_HERE')) {
    showToast('Google Review URL is not configured yet.');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

generateBtn.addEventListener('click', loadUniqueDraft);
editBtn.addEventListener('click', handleEdit);
copyBtn.addEventListener('click', handleCopy);
googleBtn.addEventListener('click', handleGoogleReview);

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.brand').textContent = BUSINESS_NAME;
  // Each new visitor/session automatically receives a unique English draft.
  void loadUniqueDraft();
});
