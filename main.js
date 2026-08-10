/* ==========================================================================
   ChemPulse Admin — vanilla JS, no build step.
   Talks to the existing /api routes using a Bearer token stored in
   localStorage. Served same-origin by adminPanelRoutes.js so there's no
   CORS to configure.
   ========================================================================== */

const STORAGE_KEY = 'chempulse_admin_token';

const state = {
  token: localStorage.getItem(STORAGE_KEY) || null,
  user: null,
};

/* ---------------------------------------------------------------------- */
/*  API client                                                             */
/* ---------------------------------------------------------------------- */

async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  let payload = null;
  try { payload = await res.json(); } catch (_) { /* no body */ }

  if (res.status === 401) {
    logout();
    throw new Error('Session expired — please sign in again.');
  }

  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.error?.details?.join(', ') ||
      payload?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return payload?.data ?? payload;
}

/* ---------------------------------------------------------------------- */
/*  Auth                                                                   */
/* ---------------------------------------------------------------------- */

function extractToken(loginData) {
  // Backend response shape for /api/auth/login wasn't available while
  // building this — trying the common field names. If login succeeds but
  // you land back on the login screen, log `loginData` here and adjust.
  return (
    loginData?.accessToken ||
    loginData?.token ||
    loginData?.tokens?.accessToken ||
    loginData?.tokens?.access ||
    loginData?.jwt ||
    null
  );
}

async function login(email, password) {
  const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
  const token = extractToken(data);
  if (!token) {
    console.warn('Could not find a token field on login response:', data);
    throw new Error('Login succeeded but no token was found in the response. Check console.');
  }
  state.token = token;
  localStorage.setItem(STORAGE_KEY, token);
  await loadCurrentUser();
}

async function loadCurrentUser() {
  const data = await api('/api/auth/me');
  state.user = data?.user || data;
  const roles = state.user?.roles || [];
  if (!roles.includes('editor') && !roles.includes('admin')) {
    logout();
    throw new Error('This account does not have editor or admin access.');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(STORAGE_KEY);
  renderAuthState();
  window.location.hash = '';
}

function isAdmin() { return !!state.user?.roles?.includes('admin'); }

/* ---------------------------------------------------------------------- */
/*  Toast                                                                  */
/* ---------------------------------------------------------------------- */

let toastTimer;
function toast(message, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.toggle('toast-error', isError);
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

/* ---------------------------------------------------------------------- */
/*  Entity configs                                                         */
/*  Each entity describes: how to list it, how to create/update it, and    */
/*  what form fields to render. `listUrl` hits the existing PUBLIC read    */
/*  routes (they already exist); writes go through /api/admin/*.          */
/* ---------------------------------------------------------------------- */

const ENTITIES = {
  articles: {
    label: 'Articles',
    listUrl: () => '/api/articles?limit=100&status=all',
    listKey: 'articles',
    adminBase: '/api/admin/articles',
    idField: '_id',
    canDelete: true,
    deleteRole: 'admin',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'category.name', label: 'Category' },
      { key: 'updatedAt', label: 'Updated', type: 'date' },
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', hint: 'Leave blank to auto-generate if your API supports it.' },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea', required: true },
      { key: 'content', label: 'Content', type: 'textarea-lg', required: true },
      { key: 'author.name', label: 'Author name', type: 'text', required: true },
      { key: 'author.bio', label: 'Author bio', type: 'textarea' },
      { key: 'author.avatarUrl', label: 'Author avatar', type: 'image', folder: 'avatars' },
      { key: 'category', label: 'Category', type: 'relation', relation: 'categories', required: true },
      { key: 'topics', label: 'Topic IDs (comma separated)', type: 'idlist', hint: 'No topic-listing endpoint exists yet — paste ObjectIds directly.' },
      { key: 'heroImage.url', label: 'Hero image', type: 'image', folder: 'heroes' },
      { key: 'heroImage.caption', label: 'Hero image caption', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published', 'archived'], default: 'draft' },
      { key: 'featured', label: 'Featured', type: 'boolean' },
      { key: 'readTimeMinutes', label: 'Read time (minutes)', type: 'number', default: 3 },
    ],
  },

  categories: {
    label: 'Categories',
    listUrl: () => '/api/categories',
    listKey: 'categories',
    adminBase: '/api/admin/categories',
    idField: '_id',
    canDelete: false,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'slug', label: 'Slug', type: 'mono' },
      { key: 'active', label: 'Active', type: 'bool' },
      { key: 'featured', label: 'Featured', type: 'bool' },
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', hint: 'Leave blank to auto-generate if your API supports it.' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'icon.name', label: 'Icon name', type: 'text', default: 'flask' },
      { key: 'icon.url', label: 'Icon image', type: 'image', folder: 'categories' },
      { key: 'displayOrder', label: 'Display order', type: 'number', default: 0 },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
      { key: 'featured', label: 'Featured', type: 'boolean' },
    ],
  },

  molecules: {
    label: 'Molecules',
    listUrl: () => '/api/molecules?limit=100',
    listKey: 'molecules',
    adminBase: '/api/admin/molecules',
    idField: '_id',
    canDelete: false,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'formula', label: 'Formula', type: 'mono' },
      { key: 'molarMass', label: 'Molar mass' },
      { key: 'updatedAt', label: 'Updated', type: 'date' },
    ],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', hint: 'Leave blank to auto-generate if your API supports it.' },
      { key: 'formula', label: 'Chemical formula', type: 'text', required: true },
      { key: 'molarMass', label: 'Molar mass (g/mol)', type: 'number', required: true },
      { key: 'description', label: 'Description', type: 'textarea-lg', required: true },
      { key: 'structureImage.url', label: 'Structure image', type: 'image', folder: 'molecules' },
      { key: 'structureImage.alt', label: 'Structure image alt text', type: 'text' },
      { key: 'commonUses', label: 'Common uses (one per line)', type: 'stringArray' },
      { key: 'properties.density', label: 'Density', type: 'text' },
      { key: 'properties.meltingPoint', label: 'Melting point', type: 'text' },
      { key: 'properties.boilingPoint', label: 'Boiling point', type: 'text' },
      { key: 'properties.appearance', label: 'Appearance', type: 'text' },
      { key: 'safetyNotes', label: 'Safety notes', type: 'textarea' },
      { key: 'featuredDate', label: 'Featured (molecule of the day) date', type: 'date' },
    ],
  },

  topics: {
    label: 'Topics',
    createOnly: true,
    createOnlyNote: 'There\u2019s no GET /api/admin/topics endpoint yet, so this can create new topics but can\u2019t list or edit existing ones. Add a list + detail route to unlock full management here.',
    adminBase: '/api/admin/topics',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', hint: 'Leave blank to auto-generate if your API supports it.' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'trendingScore', label: 'Trending score', type: 'number', default: 0 },
      { key: 'isTrending', label: 'Trending', type: 'boolean' },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },

  quizzes: {
    label: 'Quizzes',
    createOnly: true,
    createOnlyNote: 'There\u2019s no GET /api/admin/quizzes endpoint yet, so this can create new quizzes but can\u2019t list or edit existing ones. Add a list + detail route to unlock full management here.',
    adminBase: '/api/admin/quizzes',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'category', label: 'Category', type: 'relation', relation: 'categories' },
      { key: 'topic', label: 'Topic ID', type: 'idlist', single: true, hint: 'No topic-listing endpoint exists yet — paste an ObjectId directly.' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'], default: 'medium' },
      { key: 'dateIndex', label: 'Assigned date', type: 'date' },
      { key: 'active', label: 'Active', type: 'boolean', default: true },
      { key: 'questions', label: 'Questions', type: 'questions', required: true },
    ],
  },
};

/* ---------------------------------------------------------------------- */
/*  Helpers: nested get/set by dotted path                                 */
/* ---------------------------------------------------------------------- */

function getPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}
function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------------------------------------------------------------- */
/*  Router                                                                 */
/* ---------------------------------------------------------------------- */

const ROUTES = {
  dashboard: renderDashboard,
  articles: () => renderEntityList('articles'),
  categories: () => renderEntityList('categories'),
  molecules: () => renderEntityList('molecules'),
  topics: () => renderEntityList('topics'),
  quizzes: () => renderEntityList('quizzes'),
  hubs: renderHubs,
};

function currentRoute() {
  return (window.location.hash || '#dashboard').slice(1);
}

async function router() {
  if (!state.token) { showLogin(); return; }
  if (!state.user) {
    try { await loadCurrentUser(); } catch (err) { showLogin(); toast(err.message, true); return; }
  }
  showApp();
  const route = currentRoute();
  document.querySelectorAll('.sidebar-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  const handler = ROUTES[route] || renderDashboard;
  const content = document.getElementById('content');
  content.innerHTML = '<div class="spinner-row">Loading…</div>';
  try {
    await handler(content);
  } catch (err) {
    content.innerHTML = `<div class="banner banner-warn">${escapeHtml(err.message)}</div>`;
  }
}

window.addEventListener('hashchange', router);

/* ---------------------------------------------------------------------- */
/*  View toggling                                                          */
/* ---------------------------------------------------------------------- */

function showLogin() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
}
function showApp() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  document.getElementById('user-name').textContent = state.user?.name || state.user?.email || 'Account';
  const role = isAdmin() ? 'admin' : 'editor';
  document.getElementById('user-role').textContent = role;
}
function renderAuthState() { showLogin(); }

/* ---------------------------------------------------------------------- */
/*  Dashboard                                                               */
/* ---------------------------------------------------------------------- */

async function renderDashboard(content) {
  let stats = null;
  try {
    const data = await api('/api/admin/dashboard');
    stats = data?.stats || data;
  } catch (err) {
    content.innerHTML = `<div class="banner banner-warn">Couldn\u2019t load dashboard stats: ${escapeHtml(err.message)}</div>`;
    return;
  }
  const entries = stats && typeof stats === 'object' ? Object.entries(stats) : [];
  content.innerHTML = `
    <div class="page-header">
      <div><h1>Dashboard</h1><p>Signed in as ${escapeHtml(state.user?.email || '')}.</p></div>
    </div>
    <div class="table-card">
      ${entries.length === 0
        ? '<div class="empty-state"><strong>No stats returned</strong>Check the shape of GET /api/admin/dashboard.</div>'
        : `<table><tbody>${entries.map(([k, v]) => `
            <tr><td style="font-weight:500;text-transform:capitalize;">${escapeHtml(k.replace(/([A-Z])/g, ' $1'))}</td>
            <td class="cell-mono">${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>
          `).join('')}</tbody></table>`}
    </div>
  `;
}

/* ---------------------------------------------------------------------- */
/*  Generic entity list + drawer form                                      */
/* ---------------------------------------------------------------------- */

async function renderEntityList(entityKey) {
  const entity = ENTITIES[entityKey];
  const content = document.getElementById('content');

  let items = [];
  let loadError = null;
  if (!entity.createOnly) {
    try {
      const data = await api(entity.listUrl());
      items = data?.[entity.listKey] || data?.items || (Array.isArray(data) ? data : []);
    } catch (err) {
      loadError = err.message;
    }
  }

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${entity.label}</h1>
        ${entity.createOnly ? `<p>${escapeHtml(entity.createOnlyNote)}</p>` : ''}
      </div>
      <button class="btn btn-primary" id="create-btn">New ${entity.label.replace(/s$/, '')}</button>
    </div>
    ${entity.createOnly ? '' : renderTable(entity, items, loadError)}
  `;

  document.getElementById('create-btn').addEventListener('click', () => openDrawer(entityKey, null));

  if (!entity.createOnly) {
    content.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items.find((i) => String(i[entity.idField]) === btn.dataset.edit);
        openDrawer(entityKey, item);
      });
    });
    content.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(entityKey, btn.dataset.delete, items));
    });
  }
}

function renderTable(entity, items, loadError) {
  if (loadError) {
    return `<div class="banner banner-warn">Couldn\u2019t load ${entity.label.toLowerCase()}: ${escapeHtml(loadError)}</div>`;
  }
  if (!items.length) {
    return `<div class="table-card"><div class="empty-state"><strong>Nothing here yet</strong>Create the first one to get started.</div></div>`;
  }
  return `
    <div class="table-card">
      <table>
        <thead><tr>
          ${entity.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}
          <th></th>
        </tr></thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              ${entity.columns.map((c) => `<td>${renderCell(c, getPath(item, c.key))}</td>`).join('')}
              <td class="cell-actions">
                <button class="btn btn-secondary btn-sm" data-edit="${escapeHtml(item[entity.idField])}">Edit</button>
                ${entity.canDelete && (!entity.deleteRole || isAdmin()) ? `<button class="btn btn-danger btn-sm" data-delete="${escapeHtml(item[entity.idField])}">Delete</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCell(col, value) {
  if (col.type === 'status') return `<span class="status-pill status-${escapeHtml(value || '')}">${escapeHtml(value || '—')}</span>`;
  if (col.type === 'date') return fmtDate(value);
  if (col.type === 'bool') return value ? '✓' : '—';
  if (col.type === 'mono') return `<span class="cell-mono">${escapeHtml(value ?? '—')}</span>`;
  return escapeHtml(value ?? '—');
}

async function handleDelete(entityKey, id, items) {
  const entity = ENTITIES[entityKey];
  if (!confirm(`Delete this ${entity.label.toLowerCase().replace(/s$/, '')}? This can\u2019t be undone.`)) return;
  try {
    await api(`${entity.adminBase}/${id}`, { method: 'DELETE' });
    toast('Deleted.');
    router();
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------------------------------------------------------------------- */
/*  Drawer form (create / edit) — shared across all entities               */
/* ---------------------------------------------------------------------- */

let relationCache = {};

async function loadRelationOptions(relationName) {
  if (relationCache[relationName]) return relationCache[relationName];
  if (relationName === 'categories') {
    const data = await api('/api/categories');
    const list = data?.categories || [];
    relationCache[relationName] = list.map((c) => ({ value: c._id, label: c.name }));
  } else {
    relationCache[relationName] = [];
  }
  return relationCache[relationName];
}

async function openDrawer(entityKey, item) {
  const entity = ENTITIES[entityKey];
  const isEdit = !!item;
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  const body = document.getElementById('drawer-body');

  document.getElementById('drawer-title').textContent = `${isEdit ? 'Edit' : 'New'} ${entity.label.replace(/s$/, '')}`;
  overlay.classList.remove('hidden');
  drawer.classList.remove('hidden');
  body.innerHTML = '<div class="spinner-row">Loading form…</div>';

  const closeDrawer = () => { overlay.classList.add('hidden'); drawer.classList.add('hidden'); };
  overlay.onclick = closeDrawer;
  document.getElementById('drawer-close').onclick = closeDrawer;

  // Pre-load relation dropdowns referenced by this entity's fields
  const relationFields = entity.fields.filter((f) => f.type === 'relation');
  for (const f of relationFields) await loadRelationOptions(f.relation);

  const formHtml = entity.fields.map((f) => renderField(f, item ? getPath(item, f.key) : f.default)).join('');

  body.innerHTML = `
    <form id="entity-form">
      ${formHtml}
      <p id="form-error" class="form-error hidden"></p>
    </form>
    <div class="drawer-actions">
      <button type="submit" form="entity-form" class="btn btn-primary">${isEdit ? 'Save changes' : 'Create'}</button>
      <button type="button" class="btn btn-secondary" id="drawer-cancel">Cancel</button>
    </div>
  `;

  document.getElementById('drawer-cancel').onclick = closeDrawer;
  wireFieldWidgets(entity);

  document.getElementById('entity-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('form-error');
    errorEl.classList.add('hidden');
    try {
      const payload = collectFormData(entity);
      if (isEdit) {
        await api(`${entity.adminBase}/${item[entity.idField]}`, { method: 'PATCH', body: payload });
        toast('Saved.');
      } else {
        await api(entity.adminBase, { method: 'POST', body: payload });
        toast('Created.');
      }
      closeDrawer();
      router();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}

function renderField(f, value) {
  const id = `f-${f.key.replace(/\./g, '-')}`;
  const req = f.required ? 'required' : '';

  if (f.type === 'text') {
    return field(f, `<input type="text" id="${id}" data-key="${f.key}" value="${escapeHtml(value ?? '')}" ${req} />`);
  }
  if (f.type === 'number') {
    return field(f, `<input type="number" step="any" id="${id}" data-key="${f.key}" value="${escapeHtml(value ?? '')}" ${req} />`);
  }
  if (f.type === 'date') {
    const v = value ? new Date(value).toISOString().slice(0, 10) : '';
    return field(f, `<input type="date" id="${id}" data-key="${f.key}" value="${v}" ${req} />`);
  }
  if (f.type === 'textarea' || f.type === 'textarea-lg') {
    const rows = f.type === 'textarea-lg' ? 8 : 3;
    return field(f, `<textarea id="${id}" data-key="${f.key}" rows="${rows}" ${req}>${escapeHtml(value ?? '')}</textarea>`);
  }
  if (f.type === 'boolean') {
    return `<div class="field field-checkbox"><input type="checkbox" id="${id}" data-key="${f.key}" data-type="boolean" ${value ? 'checked' : ''} /><label for="${id}">${escapeHtml(f.label)}</label></div>`;
  }
  if (f.type === 'select') {
    return field(f, `<select id="${id}" data-key="${f.key}" ${req}>${f.options.map((o) => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select>`);
  }
  if (f.type === 'relation') {
    const opts = relationCache[f.relation] || [];
    const val = typeof value === 'object' && value ? value._id : value;
    return field(f, `<select id="${id}" data-key="${f.key}" ${req}><option value="">— Select —</option>${opts.map((o) => `<option value="${o.value}" ${o.value === val ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>`);
  }
  if (f.type === 'idlist') {
    const display = Array.isArray(value) ? value.join(', ') : (value || '');
    return field(f, `<input type="text" id="${id}" data-key="${f.key}" data-type="${f.single ? 'idlist-single' : 'idlist'}" value="${escapeHtml(display)}" placeholder="${f.single ? 'ObjectId' : '64f...,650a...'}" />`);
  }
  if (f.type === 'stringArray') {
    const display = Array.isArray(value) ? value.join('\n') : '';
    return field(f, `<textarea id="${id}" data-key="${f.key}" data-type="stringArray" rows="4">${escapeHtml(display)}</textarea>`);
  }
  if (f.type === 'image') {
    const v = value || '';
    return `
      <div class="field">
        <label>${escapeHtml(f.label)}</label>
        <div class="image-field-row">
          <input type="text" id="${id}" data-key="${f.key}" value="${escapeHtml(v)}" placeholder="https://…" />
          <button type="button" class="btn btn-secondary btn-sm image-upload-btn" data-target="${id}" data-folder="${f.folder || 'general'}">Upload</button>
          <input type="file" accept="image/*" class="hidden" data-file-for="${id}" />
        </div>
        ${v ? `<img src="${escapeHtml(v)}" class="image-preview" id="${id}-preview" />` : `<img src="" class="image-preview hidden" id="${id}-preview" />`}
      </div>
    `;
  }
  if (f.type === 'questions') {
    const questions = Array.isArray(value) && value.length ? value : [];
    return `
      <div class="field">
        <label>${escapeHtml(f.label)}</label>
        <div id="questions-list" data-key="${f.key}">
          ${questions.map((q, i) => renderQuestionBlock(q, i)).join('')}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="add-question-btn">Add question</button>
      </div>
    `;
  }
  return '';
}

function field(f, inputHtml) {
  return `<div class="field"><label for="f-${f.key.replace(/\./g, '-')}">${escapeHtml(f.label)}</label>${inputHtml}${f.hint ? `<div class="hint">${escapeHtml(f.hint)}</div>` : ''}</div>`;
}

let questionCounter = 0;
function renderQuestionBlock(q, index) {
  questionCounter++;
  const uid = `q${questionCounter}`;
  return `
    <div class="question-block" data-question data-uid="${uid}">
      <button type="button" class="btn-icon remove-question" aria-label="Remove">&times;</button>
      <div class="field"><label>Question text</label><input type="text" data-q="questionText" value="${escapeHtml(q?.questionText ?? '')}" /></div>
      <div class="field"><label>Options (one per line)</label><textarea data-q="options" rows="4">${escapeHtml((q?.options || []).join('\n'))}</textarea></div>
      <div class="field"><label>Correct option index (0-based)</label><input type="number" min="0" data-q="correctOptionIndex" value="${q?.correctOptionIndex ?? 0}" /></div>
      <div class="field"><label>Explanation</label><textarea data-q="explanation" rows="2">${escapeHtml(q?.explanation ?? '')}</textarea></div>
    </div>
  `;
}

function wireFieldWidgets(entity) {
  document.querySelectorAll('.image-upload-btn').forEach((btn) => {
    const fileInput = document.querySelector(`[data-file-for="${btn.dataset.target}"]`);
    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', btn.dataset.folder);
      try {
        toast('Uploading…');
        const data = await api('/api/media/upload', { method: 'POST', body: fd, isForm: true });
        const url = data?.media?.url || data?.url;
        if (!url) throw new Error('Upload succeeded but no URL was returned — check /api/media/upload response shape.');
        const targetInput = document.getElementById(btn.dataset.target);
        targetInput.value = url;
        const preview = document.getElementById(`${btn.dataset.target}-preview`);
        if (preview) { preview.src = url; preview.classList.remove('hidden'); }
        toast('Image uploaded.');
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  const addQuestionBtn = document.getElementById('add-question-btn');
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', () => {
      document.getElementById('questions-list').insertAdjacentHTML('beforeend', renderQuestionBlock(null, 0));
      wireQuestionRemovers();
    });
  }
  wireQuestionRemovers();
}

function wireQuestionRemovers() {
  document.querySelectorAll('.remove-question').forEach((btn) => {
    btn.onclick = () => btn.closest('[data-question]').remove();
  });
}

function collectFormData(entity) {
  const out = {};
  entity.fields.forEach((f) => {
    if (f.type === 'questions') {
      const blocks = document.querySelectorAll('[data-question]');
      const questions = Array.from(blocks).map((b) => ({
        questionText: b.querySelector('[data-q="questionText"]').value.trim(),
        options: b.querySelector('[data-q="options"]').value.split('\n').map((s) => s.trim()).filter(Boolean),
        correctOptionIndex: Number(b.querySelector('[data-q="correctOptionIndex"]').value),
        explanation: b.querySelector('[data-q="explanation"]').value.trim(),
      }));
      setPath(out, f.key, questions);
      return;
    }
    const el = document.getElementById(`f-${f.key.replace(/\./g, '-')}`);
    if (!el) return;
    let value;
    if (el.dataset.type === 'boolean') {
      value = el.checked;
    } else if (el.dataset.type === 'stringArray') {
      value = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
    } else if (el.dataset.type === 'idlist') {
      value = el.value.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (el.dataset.type === 'idlist-single') {
      value = el.value.trim() || null;
    } else if (f.type === 'number') {
      value = el.value === '' ? undefined : Number(el.value);
    } else {
      value = el.value;
    }
    if (value === '' && !f.required) return; // let backend defaults apply
    if (value !== undefined) setPath(out, f.key, value);
  });
  return out;
}

/* ---------------------------------------------------------------------- */
/*  Category Hubs — one hub per category, so this is category-driven       */
/* ---------------------------------------------------------------------- */

async function renderHubs(content) {
  let categories = [];
  try {
    const data = await api('/api/categories');
    categories = data?.categories || [];
  } catch (err) {
    content.innerHTML = `<div class="banner banner-warn">Couldn\u2019t load categories: ${escapeHtml(err.message)}</div>`;
    return;
  }

  content.innerHTML = `
    <div class="page-header">
      <div><h1>Category Hubs</h1><p>Each hub configures the landing page for one category — hero copy, stats, and subtopics.</p></div>
    </div>
    <div class="table-card">
      ${categories.length === 0 ? '<div class="empty-state"><strong>No categories yet</strong>Create a category first.</div>' : `
      <table>
        <thead><tr><th>Category</th><th>Slug</th><th></th></tr></thead>
        <tbody>
          ${categories.map((c) => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td class="cell-mono">${escapeHtml(c.slug)}</td>
              <td class="cell-actions"><button class="btn btn-secondary btn-sm" data-hub="${c._id}" data-slug="${escapeHtml(c.slug)}">Configure hub</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;

  content.querySelectorAll('[data-hub]').forEach((btn) => {
    btn.addEventListener('click', () => openHubDrawer(btn.dataset.hub, btn.dataset.slug));
  });
}

async function openHubDrawer(categoryId, slug) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  const body = document.getElementById('drawer-body');
  document.getElementById('drawer-title').textContent = 'Category Hub';
  overlay.classList.remove('hidden');
  drawer.classList.remove('hidden');
  body.innerHTML = '<div class="spinner-row">Loading…</div>';
  const closeDrawer = () => { overlay.classList.add('hidden'); drawer.classList.add('hidden'); };
  overlay.onclick = closeDrawer;
  document.getElementById('drawer-close').onclick = closeDrawer;

  let hub = null;
  try {
    hub = await api(`/api/categories/${slug}/hub`);
    hub = hub?.hub || hub;
  } catch (_) { /* no hub yet — that's fine, we're creating one */ }

  body.innerHTML = `
    <form id="hub-form">
      <div class="field"><label>Hero title</label><input type="text" id="hub-heroTitle" value="${escapeHtml(hub?.heroTitle ?? '')}" required /></div>
      <div class="field"><label>Hero description</label><textarea id="hub-heroDescription" rows="4" required>${escapeHtml(hub?.heroDescription ?? '')}</textarea></div>
      <div class="field"><label>Hero image URL</label><input type="text" id="hub-heroImageUrl" value="${escapeHtml(hub?.heroImageUrl ?? '')}" /></div>
      <div class="field">
        <label>Statistics (label | value | unit — one per line)</label>
        <textarea id="hub-statistics" rows="4">${(hub?.statistics || []).map((s) => `${s.label} | ${s.value} | ${s.unit || ''}`).join('\n')}</textarea>
        <div class="hint">Example: Molecules cataloged | 1,204 | compounds</div>
      </div>
      <div class="field">
        <label>Subtopics (name | slug — one per line)</label>
        <textarea id="hub-subtopics" rows="4">${(hub?.subtopics || []).map((s) => `${s.name} | ${s.slug}`).join('\n')}</textarea>
      </div>
      <p id="hub-form-error" class="form-error hidden"></p>
    </form>
    <div class="drawer-actions">
      <button type="submit" form="hub-form" class="btn btn-primary">Save hub</button>
      <button type="button" class="btn btn-secondary" id="hub-cancel">Cancel</button>
    </div>
  `;
  document.getElementById('hub-cancel').onclick = closeDrawer;

  document.getElementById('hub-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('hub-form-error');
    errorEl.classList.add('hidden');
    const statistics = document.getElementById('hub-statistics').value.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const [label, value, unit] = line.split('|').map((s) => s.trim());
      return { label, value, unit: unit || '' };
    });
    const subtopics = document.getElementById('hub-subtopics').value.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const [name, slug2] = line.split('|').map((s) => s.trim());
      return { name, slug: slug2 };
    });
    const payload = {
      category: categoryId,
      heroTitle: document.getElementById('hub-heroTitle').value.trim(),
      heroDescription: document.getElementById('hub-heroDescription').value.trim(),
      heroImageUrl: document.getElementById('hub-heroImageUrl').value.trim(),
      statistics,
      subtopics,
    };
    try {
      await api('/api/admin/hubs', { method: 'POST', body: payload });
      toast('Hub saved.');
      closeDrawer();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}

/* ---------------------------------------------------------------------- */
/*  Boot                                                                    */
/* ---------------------------------------------------------------------- */

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    await login(email, password);
    window.location.hash = '#dashboard';
    router();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', logout);

router();
