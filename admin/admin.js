const sections = {
  sections: ['Custom sections', 'Section name (also used in navigation)', 'Section content', 'Optional link URL'],
  profile: ['Profile', 'Name', 'Bio', 'Profile URL'],
  projects: ['Projects', 'Project title', 'Project details', 'Project URL'],
  blogs: ['Blogs', 'Post title', 'Post content', 'Article URL'],
  writeups: ['Writeups', 'Writeup title', 'Walkthrough', 'Reference URL'],
  achievements: ['Achievements', 'Achievement title', 'Details', 'Evidence URL'],
  career: ['Work (job experience)', 'Role or position', 'Company, dates, and responsibilities', 'Reference URL'],
  toolkit: ['Skills', 'Skill or tool', 'Details', 'Reference URL'],
  contact: ['Contact', 'Contact heading', 'Contact message', 'Contact URL'],
  background: ['Education', 'Entry title', 'Education or credential details', 'Reference URL'],
  github: ['GitHub', 'Repository or activity title', 'Details', 'Repository URL'],
};
const storageKey = 'rd-portfolio-admin-drafts-v1';
const editor = document.querySelector('#editor');
const entries = document.querySelector('#entries');
const status = document.querySelector('#status');
const deleteButton = document.querySelector('#delete-entry');
let drafts = [];
try { drafts = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}
if (!Array.isArray(drafts)) drafts = [];
let section = 'profile';
let activeId = null;
let published = [];
const unpublish = document.querySelector('#unpublish-entry');
const loginForm = document.querySelector('#login');
const loginStatus = document.querySelector('#login-status');

class SignedOut extends Error {}

// Every request carries a custom header and relies on the HttpOnly session cookie; the server rejects anything else.
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {'X-Requested-With': 'admin', ...options.headers},
  });
  if (response.status === 401) {
    lock();
    throw new SignedOut();
  }
  return response;
}

function lock() {
  document.body.classList.add('locked');
  document.querySelector('#password').focus();
}

async function loadPublished() {
  const response = await api('/api/content');
  if (!response.ok) throw new Error();
  published = await response.json();
  document.body.classList.remove('locked');
  openSection();
}

const mediaInput = document.querySelector('#media-input');
const mediaList = document.querySelector('#media-list');
let media = [];
let editorRevision = 0;
let uploading = false;

function renderMedia() {
  mediaList.replaceChildren(...media.map(item => {
    const row = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = item.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove ' + item.name);
    remove.addEventListener('click', () => {
      media = media.filter(file => file.id !== item.id);
      renderMedia();
    });
    row.append(name, remove);
    return row;
  }));
}

document.querySelector('#add-media').addEventListener('click', () => mediaInput.click());
mediaInput.addEventListener('change', async () => {
  const files = [...mediaInput.files];
  mediaInput.value = '';
  if (!files.length || uploading) return;
  if (media.length + files.length > 20) {
    status.textContent = 'You can attach up to 20 files per entry.';
    return;
  }
  const revision = editorRevision;
  let failed = 0;
  uploading = true;
  status.textContent = 'Uploading media…';
  try {
    for (const file of files) {
      if (revision !== editorRevision) break;
      try {
        const response = await api('/api/media?name=' + encodeURIComponent(file.name), {
          method: 'POST',
          headers: {'Content-Type': 'application/octet-stream'},
          body: file,
        });
        if (!response.ok) throw new Error('Upload failed');
        const attachment = await response.json();
        if (revision === editorRevision) media.push(attachment);
      } catch {
        failed++;
      }
    }
  } finally {
    uploading = false;
    if (revision === editorRevision) {
      renderMedia();
      status.textContent = failed ? failed + ' file(s) failed to upload. Check the format and the 4 MB limit.' : 'Media attached. Save or publish this entry.';
    }
  }
});

function openDraft(draft) {
  editorRevision++;
  media = [...(draft?.media ?? [])];
  renderMedia();
  editor.reset();
  activeId = draft?.id ?? null;
  if (draft) {
    for (const field of ['title', 'body', 'url', 'platform', 'role', 'github']) {
      if (draft[field]) editor.elements.namedItem(field).value = draft[field];
    }
  }
  const isPublished = published.some(item => item.id === activeId);
  deleteButton.hidden = !draft || isPublished;
  unpublish.hidden = !isPublished;
  status.textContent = '';
  renderEntries();
}

function renderEntries() {
  const items = sectionEntries();
  document.querySelector('#empty').hidden = items.length > 0;
  entries.replaceChildren(...items.map(draft => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = draft.title + (published.some(item => item.id === draft.id) ? ' · Published' : ' · Draft');
    if (draft.id === activeId) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => openDraft(draft));
    item.append(button);
    return item;
  }));
}

function openSection() {
  const hash = location.hash.slice(1);
  section = Object.hasOwn(sections, hash) ? hash : 'profile';
  const [heading, title, body, link] = sections[section];
  document.querySelector('#entries-title').textContent = heading;
  document.querySelector('#title-label').textContent = title;
  document.querySelector('#body-label').textContent = body;
  document.querySelector('#link-label').textContent = link;
  document.querySelector('#platform-field').hidden = section !== 'writeups';
  document.querySelectorAll('.admin-nav a').forEach(anchor => {
    if (anchor.hash === '#' + section) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  });
  document.querySelector('.media-help').textContent = section === 'profile'
    ? 'The first image appears in the homepage hero portrait. The first PDF or document becomes the downloadable résumé. Up to 50 MB per file.'
    : 'Images, MP4 or WebM videos, PDFs, and documents. Up to 50 MB per file.';
  document.querySelector('#github-field').hidden = section !== 'profile';
  document.querySelector('#role-field').hidden = section !== 'profile';
  openDraft(section === 'sections' ? null : sectionEntries()[0]);
  document.querySelector('#new-entry').textContent = section === 'sections' ? '+ Add section' : '+ New draft';
}

function save(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    drafts = next;
    return true;
  } catch {
    status.textContent = 'Could not save drafts in this browser.';
    return false;
  }
}

function sectionEntries() {
  return [...drafts, ...published.filter(item => !drafts.some(draft => draft.id === item.id))]
    .filter(item => item.section === section);
}

async function updatePublication(action, draft) {
  const response = await api('/api/content', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action, draft}),
  });
  if (!response.ok) throw new Error('Publishing request failed.');
  published = await response.json();
}

editor.addEventListener('submit', async event => {
  event.preventDefault();
  if (uploading) {
    status.textContent = 'Wait for uploads to finish before saving.';
    return;
  }
  const fields = new FormData(editor);
  const title = fields.get('title').trim();
  if (!title) {
    status.textContent = 'Enter a title before saving.';
    return;
  }
  const draft = {
    id: activeId ?? crypto.randomUUID(),
    section,
    title,
    body: fields.get('body').trim(),
    media: [...media],
    url: fields.get('url').trim(),
    role: section === 'profile' ? fields.get('role').trim() : '',
    github: section === 'profile' ? fields.get('github').trim() : '',
    platform: section === 'writeups' ? fields.get('platform') : '',
  };
  if (save([...drafts.filter(item => item.id !== draft.id), draft])) {
    openDraft(draft);
    status.textContent = 'Draft saved in this browser.';
    if (event.submitter?.id === 'publish-entry') {
      const button = event.submitter;
      button.disabled = true;
      try {
        await updatePublication('publish', draft);
        if (activeId === draft.id) {
          openDraft(draft);
          status.textContent = 'Published to your portfolio.';
        } else renderEntries();
      } catch {
        if (activeId === draft.id) status.textContent = 'Draft saved. Publishing failed. Check that links start with http or https, then try again.';
      } finally {
        button.disabled = false;
      }
    }
  }
});

document.querySelector('#new-entry').addEventListener('click', () => {
  openDraft(null);
  editor.elements.namedItem('title').focus();
});
deleteButton.addEventListener('click', () => {
  if (confirm('Delete this local draft?') && save(drafts.filter(draft => draft.id !== activeId))) {
    openDraft(null);
    status.textContent = 'Draft deleted.';
  }
});
unpublish.addEventListener('click', async () => {
  const draft = published.find(item => item.id === activeId);
  if (!draft || !confirm('Remove this entry from the portfolio?')) return;
  unpublish.disabled = true;
  try {
    if (!drafts.some(item => item.id === draft.id) && !save([...drafts, draft])) return;
    await updatePublication('unpublish', draft);
    if (activeId === draft.id) {
      openDraft(drafts.find(item => item.id === draft.id));
      status.textContent = 'Unpublished. Your draft is still available.';
    } else renderEntries();
  } catch {
    status.textContent = 'Could not unpublish this entry.';
  } finally {
    unpublish.disabled = false;
  }
});
window.addEventListener('hashchange', openSection);
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginStatus.textContent = 'Signing in…';
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', 'X-Requested-With': 'admin'},
      body: JSON.stringify({password: loginForm.elements.namedItem('password').value}),
    });
    if (response.status === 429) throw new Error('Too many attempts. Try again later.');
    if (!response.ok) throw new Error('Incorrect password.');
    loginForm.reset();
    loginStatus.textContent = '';
    await loadPublished();
  } catch (error) {
    loginStatus.textContent = error.message || 'Could not sign in.';
  }
});
document.querySelector('#logout').addEventListener('click', async () => {
  try { await api('/api/logout', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'}); } catch {}
  published = [];
  lock();
});
loadPublished().catch(error => {
  if (!(error instanceof SignedOut)) status.textContent = 'Could not load published content.';
});
openSection();
