const app = document.getElementById('app');

const SUBJECTS = ['행정법', '토지보상법', '부동산공시법', '감정평가법'];
const DB_NAME = 'LawRecallDB';
const DB_VERSION = 2;
const LEGACY_STORE = 'pdfFiles';
const LIBRARY_STORE = 'pdfLibrary';
const LINKS_STORE = 'subjectLinks';

const state = {
  mode: '법규',
  categories: new Set(['행정법']),
  grades: new Set(['A']),
  scope: '목차 전체',
  pdfLibrary: [],
  subjectLinks: Object.fromEntries(SUBJECTS.map(subject => [subject, []])),
  pdfUrls: {},
  activePdfId: null,
  issueTitle: '',
  answer: '',
  result: { outline: null, prose: null },
  wrongIssues: [],
  completedCount: 0,
  sessionResults: []
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function makeId() {
  return `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(timestamp));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LIBRARY_STORE)) {
        db.createObjectStore(LIBRARY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LINKS_STORE)) {
        db.createObjectStore(LINKS_STORE, { keyPath: 'category' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function migrateLegacyPdfs(db) {
  if (!db.objectStoreNames.contains(LEGACY_STORE)) return;

  const legacyRecords = await new Promise((resolve, reject) => {
    const tx = db.transaction(LEGACY_STORE, 'readonly');
    const request = tx.objectStore(LEGACY_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  if (!legacyRecords.length) return;

  const currentLibrary = await new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readonly');
    const request = tx.objectStore(LIBRARY_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  const existingIds = new Set(currentLibrary.map(item => item.id));

  const tx = db.transaction([LIBRARY_STORE, LINKS_STORE], 'readwrite');
  const libraryStore = tx.objectStore(LIBRARY_STORE);
  const linksStore = tx.objectStore(LINKS_STORE);

  for (const record of legacyRecords) {
    if (!record.file || !SUBJECTS.includes(record.category)) continue;
    const id = `legacy-${record.category}`;
    if (!existingIds.has(id)) {
      libraryStore.put({
        id,
        name: record.file.name || `${record.category}.pdf`,
        file: record.file,
        size: record.file.size || 0,
        savedAt: record.savedAt || Date.now()
      });
    }
    const existingLink = await requestToPromise(linksStore.get(record.category));
    const pdfIds = new Set(existingLink?.pdfIds || []);
    pdfIds.add(id);
    linksStore.put({ category: record.category, pdfIds: [...pdfIds] });
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function loadPdfData() {
  try {
    const db = await openDb();
    await migrateLegacyPdfs(db);

    const [library, links] = await Promise.all([
      new Promise((resolve, reject) => {
        const tx = db.transaction(LIBRARY_STORE, 'readonly');
        const request = tx.objectStore(LIBRARY_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const tx = db.transaction(LINKS_STORE, 'readonly');
        const request = tx.objectStore(LINKS_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      })
    ]);

    state.pdfLibrary = library.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
    state.subjectLinks = Object.fromEntries(SUBJECTS.map(subject => [subject, []]));
    links.forEach(link => {
      if (SUBJECTS.includes(link.category)) state.subjectLinks[link.category] = link.pdfIds || [];
    });
    db.close();
  } catch (error) {
    console.error('PDF 정보를 불러오지 못했습니다.', error);
    alert('저장된 PDF 정보를 불러오지 못했습니다. 브라우저 저장공간을 확인하세요.');
  }
}

async function addPdfFiles(input) {
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length) return;

  const invalid = files.find(file => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
  if (invalid) {
    alert('PDF 파일만 등록할 수 있습니다.');
    return;
  }

  try {
    const db = await openDb();
    const tx = db.transaction(LIBRARY_STORE, 'readwrite');
    const store = tx.objectStore(LIBRARY_STORE);
    const now = Date.now();
    files.forEach((file, index) => store.put({
      id: makeId(),
      name: file.name,
      file,
      size: file.size,
      savedAt: now + index
    }));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    await loadPdfData();
    renderPdfManager();
  } catch (error) {
    console.error(error);
    alert('PDF를 저장하지 못했습니다. 브라우저 저장공간이 부족하거나 권한이 차단되었을 수 있습니다.');
  }
}

async function renamePdf(pdfId) {
  const item = state.pdfLibrary.find(pdf => pdf.id === pdfId);
  if (!item) return;
  const nextName = prompt('앱에 표시할 PDF 이름을 입력하세요.', item.name);
  if (!nextName || !nextName.trim() || nextName.trim() === item.name) return;

  const db = await openDb();
  const tx = db.transaction(LIBRARY_STORE, 'readwrite');
  tx.objectStore(LIBRARY_STORE).put({ ...item, name: nextName.trim() });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await loadPdfData();
  renderPdfManager();
}

async function deleteLibraryPdf(pdfId) {
  const item = state.pdfLibrary.find(pdf => pdf.id === pdfId);
  if (!item) return;
  if (!confirm(`「${item.name}」을 PDF 라이브러리에서 삭제할까요?\n연결된 모든 과목에서도 함께 해제됩니다.`)) return;

  const db = await openDb();
  const tx = db.transaction([LIBRARY_STORE, LINKS_STORE], 'readwrite');
  tx.objectStore(LIBRARY_STORE).delete(pdfId);
  const linksStore = tx.objectStore(LINKS_STORE);
  for (const subject of SUBJECTS) {
    const remaining = (state.subjectLinks[subject] || []).filter(id => id !== pdfId);
    linksStore.put({ category: subject, pdfIds: remaining });
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  if (state.pdfUrls[pdfId]) URL.revokeObjectURL(state.pdfUrls[pdfId]);
  delete state.pdfUrls[pdfId];
  await loadPdfData();
  renderPdfManager();
}

async function togglePdfLink(subject, pdfId) {
  const current = new Set(state.subjectLinks[subject] || []);
  current.has(pdfId) ? current.delete(pdfId) : current.add(pdfId);

  const db = await openDb();
  const tx = db.transaction(LINKS_STORE, 'readwrite');
  tx.objectStore(LINKS_STORE).put({ category: subject, pdfIds: [...current] });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  state.subjectLinks[subject] = [...current];
  renderPdfManager();
}

function getPdf(pdfId) {
  return state.pdfLibrary.find(pdf => pdf.id === pdfId) || null;
}

function getPdfUrl(pdfId) {
  const item = getPdf(pdfId);
  if (!item?.file) return null;
  if (!state.pdfUrls[pdfId]) state.pdfUrls[pdfId] = URL.createObjectURL(item.file);
  return state.pdfUrls[pdfId];
}

function revokePdfUrls() {
  Object.values(state.pdfUrls).forEach(url => URL.revokeObjectURL(url));
  state.pdfUrls = {};
}

function availablePdfIdsForSelectedSubjects() {
  const ids = [];
  for (const subject of state.categories) {
    for (const id of state.subjectLinks[subject] || []) {
      if (!ids.includes(id) && getPdf(id)) ids.push(id);
    }
  }
  return ids;
}

function subjectsForPdf(pdfId, onlySelected = false) {
  const subjects = onlySelected ? [...state.categories] : SUBJECTS;
  return subjects.filter(subject => (state.subjectLinks[subject] || []).includes(pdfId));
}

function missingSelectedSubjects() {
  return [...state.categories].filter(subject => {
    const validIds = (state.subjectLinks[subject] || []).filter(id => getPdf(id));
    return validIds.length === 0;
  });
}

function chip(label, selected, onClick, extraClass = '') {
  return `<button type="button" class="chip ${selected ? 'selected' : ''} ${extraClass}" onclick="${onClick}">${label}</button>`;
}

function pageShell(content, options = {}) {
  const { backAction = '', title = '', subtitle = '', wide = false, rightAction = '' } = options;
  app.innerHTML = `
    <main class="page ${wide ? 'wide' : ''}">
      <header class="topbar">
        ${backAction ? `<button class="icon-button" onclick="${backAction}" aria-label="뒤로가기">←</button>` : '<span></span>'}
        <div class="topbar-title">
          ${title ? `<h1>${title}</h1>` : ''}
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        ${rightAction || '<span></span>'}
      </header>
      ${content}
    </main>`;
  window.scrollTo(0, 0);
}

function renderMain() {
  pageShell(`
    <section class="hero card">
      <div class="brand-mark">LR</div>
      <p class="eyebrow">PDF 원문 직접 비교형 암기 테스트</p>
      <h2>LAW RECALL</h2>
      <p class="muted">답안을 작성한 뒤 등록한 PDF 원문을 보면서 직접 O/X를 판정합니다.</p>
      <button class="primary large" onclick="renderSetup()">시험 시작</button>
      <button class="secondary large main-secondary" onclick="renderPdfManager()">PDF 관리</button>
    </section>
    <section class="card compact info-card">
      <h3>현재 방식</h3>
      <div class="info-row"><span>원문</span><strong>PDF 여러 개 등록 후 과목별 연결</strong></div>
      <div class="info-row"><span>채점</span><strong>자동채점 없이 직접 O/X</strong></div>
      <div class="info-row"><span>저장</span><strong>기기 브라우저에만 보관</strong></div>
    </section>
  `, { title: '' });
}

function renderPdfManager() {
  const libraryRows = state.pdfLibrary.length ? state.pdfLibrary.map(item => {
    const linked = subjectsForPdf(item.id);
    return `<div class="library-item">
      <div class="library-file-icon">PDF</div>
      <div class="library-file-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${formatBytes(item.size)} · 등록 ${formatDate(item.savedAt)}</small>
        <div class="linked-subjects">${linked.length
          ? linked.map(subject => `<span>${subject}</span>`).join('')
          : '<em>연결된 과목 없음</em>'}</div>
      </div>
      <div class="library-item-actions">
        <button class="secondary small" onclick="renamePdf('${item.id}')">이름 변경</button>
        <button class="text-danger small" onclick="deleteLibraryPdf('${item.id}')">삭제</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty-state"><strong>등록된 PDF가 없습니다.</strong><p>행정법①, 행정법②, 개별법 PDF 등을 먼저 추가하세요.</p></div>`;

  const subjectSections = SUBJECTS.map(subject => `
    <div class="subject-link-card">
      <div class="subject-link-heading">
        <strong>${subject}</strong>
        <span>${(state.subjectLinks[subject] || []).filter(id => getPdf(id)).length}개 연결</span>
      </div>
      ${state.pdfLibrary.length ? `<div class="link-check-list">${state.pdfLibrary.map(item => {
        const checked = (state.subjectLinks[subject] || []).includes(item.id);
        return `<label class="link-check ${checked ? 'checked' : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="togglePdfLink('${subject}','${item.id}')">
          <span><strong>${escapeHtml(item.name)}</strong><small>${formatBytes(item.size)}</small></span>
        </label>`;
      }).join('')}</div>` : '<p class="privacy-note">PDF를 먼저 추가하세요.</p>'}
    </div>`).join('');

  pageShell(`
    <section class="card form-card">
      <div class="section-block">
        <div class="section-heading"><h2>PDF 라이브러리</h2><span>여러 개 등록 가능</span></div>
        <label class="primary pdf-add-button">
          PDF 추가
          <input type="file" accept="application/pdf,.pdf" multiple onchange="addPdfFiles(this)">
        </label>
        <p class="privacy-note">한 번에 여러 PDF를 선택할 수 있습니다. 같은 PDF를 여러 과목에 연결할 수도 있습니다.</p>
        <div class="library-list">${libraryRows}</div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>과목과 PDF 연결</h2><span>복수 연결 가능</span></div>
        <div class="subject-link-grid">${subjectSections}</div>
      </div>

      <div class="policy-box">추천 연결: <strong>행정법 → 행정법①·행정법②</strong>, 토지보상법·부동산공시법·감정평가법 → <strong>개별법 PDF</strong></div>
      <button class="primary large" onclick="renderSetup()">설정 완료</button>
    </section>
  `, { backAction: 'renderMain()', title: 'PDF 관리', subtitle: 'PDF를 등록하고 사용할 과목에 연결합니다.' });
}

function toggleSet(target, value) {
  const set = state[target];
  if (set.has(value)) {
    if (set.size > 1) set.delete(value);
  } else {
    set.add(value);
  }
  renderSetup();
}

function selectMode(mode) {
  state.mode = mode;
  renderSetup();
}

function selectScope(scope) {
  state.scope = scope;
  if (scope === '목차 전체') state.result.prose = null;
  renderSetup();
}

function subjectPdfSummary(subject) {
  const files = (state.subjectLinks[subject] || []).map(getPdf).filter(Boolean);
  if (!files.length) return '<span class="not-connected">연결 없음</span>';
  return files.map(item => `<span class="connected-file">${escapeHtml(item.name)}</span>`).join('');
}

function renderSetup() {
  const grades = [['A', '빈출'], ['B', '출제'], ['C', '출제 가능'], ['D', '불의타']];
  const missing = missingSelectedSubjects();

  pageShell(`
    <section class="card form-card">
      <div class="section-block">
        <div class="section-heading"><h2>구분</h2><span>하나 선택</span></div>
        <div class="segmented two">
          ${chip('법규', state.mode === '법규', "selectMode('법규')")}
          ${chip('이론', state.mode === '이론', "selectMode('이론')")}
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>카테고리</h2><span>복수 선택 가능</span></div>
        <div class="chip-grid two-col">
          ${SUBJECTS.map(category => chip(category, state.categories.has(category), `toggleSet('categories','${category}')`)).join('')}
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>논점 등급</h2><span>복수 선택 가능</span></div>
        <div class="chip-grid grade-grid">
          ${grades.map(([grade, description]) => chip(`<b>${grade}</b><small>${description}</small>`, state.grades.has(grade), `toggleSet('grades','${grade}')`, `grade-${grade.toLowerCase()}`)).join('')}
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>시험 범위</h2><span>하나 선택</span></div>
        <div class="scope-grid">
          <button type="button" class="scope-card ${state.scope === '목차 전체' ? 'selected' : ''}" onclick="selectScope('목차 전체')">
            <strong>목차 전체</strong><span>각 논점의 마지막 목차 수준까지 작성</span>
          </button>
          <button type="button" class="scope-card ${state.scope === '모든 내용' ? 'selected' : ''}" onclick="selectScope('모든 내용')">
            <strong>모든 내용</strong><span>목차 전체와 해당 줄글까지 작성</span>
          </button>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>연결된 원문 PDF</h2><button class="inline-link" onclick="renderPdfManager()">PDF 관리</button></div>
        <div class="setup-pdf-summary">${SUBJECTS.map(subject => `
          <div class="setup-pdf-row ${state.categories.has(subject) ? 'selected-subject' : ''}">
            <strong>${subject}</strong><div>${subjectPdfSummary(subject)}</div>
          </div>`).join('')}</div>
      </div>

      <button class="primary large" onclick="startTest()" ${missing.length ? 'disabled' : ''}>시험 시작</button>
      ${missing.length ? `<p class="validation-note">선택한 과목에 PDF를 연결하세요: ${missing.join(', ')}</p>` : ''}
    </section>
  `, { backAction: 'renderMain()', title: '시험 설정', subtitle: '원문 PDF를 기준으로 직접 비교합니다.' });
}

function startTest() {
  const missing = missingSelectedSubjects();
  if (missing.length) {
    alert(`선택한 과목에 PDF를 연결하세요: ${missing.join(', ')}`);
    return;
  }

  const available = availablePdfIdsForSelectedSubjects();
  state.activePdfId = available.includes(state.activePdfId) ? state.activePdfId : available[0];
  state.issueTitle = '';
  state.answer = '';
  state.result = { outline: null, prose: null };
  state.completedCount = 0;
  state.sessionResults = [];
  state.wrongIssues = [];
  renderAnswer();
}

function persistDraft() {
  const issue = document.getElementById('issueTitle');
  const answer = document.getElementById('answerText');
  if (issue) state.issueTitle = issue.value;
  if (answer) state.answer = answer.value;
}

function setActivePdf(pdfId, returnTo = 'answer') {
  if (!getPdf(pdfId)) return;
  state.activePdfId = pdfId;
  returnTo === 'compare' ? renderCompare() : renderAnswer();
}

function pdfSourceSelector(returnTo = 'answer') {
  const ids = availablePdfIdsForSelectedSubjects();
  if (ids.length <= 1) return '';
  return `<section class="card compact source-selector">
    <strong>비교할 원문</strong>
    <div class="tag-row">${ids.map(id => {
      const item = getPdf(id);
      const subjects = subjectsForPdf(id, true).join('·');
      return `<button class="source-chip ${state.activePdfId === id ? 'selected' : ''}" onclick="setActivePdf('${id}','${returnTo}')">${escapeHtml(item.name)}<small>${subjects}</small></button>`;
    }).join('')}</div>
  </section>`;
}

function renderAnswer() {
  const tags = [state.mode, ...state.categories, ...[...state.grades].map(grade => `${grade}급`), state.scope];
  const pdfItem = getPdf(state.activePdfId);
  if (!pdfItem) {
    alert('사용할 PDF를 찾지 못했습니다. PDF 연결을 다시 확인하세요.');
    renderSetup();
    return;
  }

  pageShell(`
    <section class="test-meta card compact">
      <div>
        <div class="progress-label">${state.completedCount + 1}번째 논점</div>
        <div class="tag-row">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
      <div class="pdf-name">원문: <strong>${escapeHtml(pdfItem.name)}</strong></div>
    </section>

    ${pdfSourceSelector('answer')}

    <section class="card answer-card">
      <label class="field-label" for="issueTitle">현재 논점</label>
      <input id="issueTitle" class="text-input title-input" type="text" value="${escapeHtml(state.issueTitle)}" placeholder="예: 대집행" autocomplete="off">

      <div class="answer-heading">
        <label class="field-label" for="answerText">답안을 작성하세요</label>
        <span>${state.scope === '목차 전체' ? '마지막 목차 수준까지' : '목차와 줄글 전체'}</span>
      </div>
      <textarea id="answerText" class="answer-sheet" spellcheck="false" placeholder="물리 키보드로 답안을 작성하세요.">${escapeHtml(state.answer)}</textarea>

      <div class="action-grid">
        <button class="secondary" onclick="openPdfPreview()">PDF 원문 보기</button>
        <button class="primary" onclick="completeAnswer()">작성 완료</button>
      </div>
    </section>
  `, { backAction: 'persistDraft(); renderSetup()', title: '답안 작성', subtitle: '자동 저장 없이 현재 화면에서 작성합니다.', wide: true });

  document.getElementById('answerText')?.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') completeAnswer();
  });
}

function openPdfPreview() {
  persistDraft();
  const item = getPdf(state.activePdfId);
  const url = getPdfUrl(state.activePdfId);
  pageShell(`
    ${pdfSourceSelector('answer')}
    <section class="pdf-toolbar card compact">
      <div><strong>${escapeHtml(item.name)}</strong><small> 브라우저 PDF 도구로 페이지 이동·확대 가능</small></div>
      <button class="primary small" onclick="renderAnswer()">답안으로 돌아가기</button>
    </section>
    <section class="pdf-frame-wrap">
      <object class="pdf-frame" data="${url}" type="application/pdf">
        <div class="pdf-fallback card"><p>이 브라우저에서는 PDF 미리보기를 표시하지 못했습니다.</p><a class="primary link-button" href="${url}" target="_blank" rel="noopener">새 창에서 PDF 열기</a></div>
      </object>
    </section>
  `, { backAction: 'renderAnswer()', title: 'PDF 원문', subtitle: '답안을 수정하려면 뒤로 돌아가세요.', wide: true });
}

function completeAnswer() {
  persistDraft();
  if (!state.issueTitle.trim()) {
    alert('현재 논점명을 입력하세요.');
    document.getElementById('issueTitle')?.focus();
    return;
  }
  if (!state.answer.trim()) {
    alert('답안을 작성하세요.');
    document.getElementById('answerText')?.focus();
    return;
  }
  renderCompare();
}

function setResult(type, value) {
  state.result[type] = value;
  renderCompare();
}

function resultButtons(type, label) {
  return `<div class="judge-row">
    <div><strong>${label}</strong><small>${type === 'outline' ? '모든 수준의 목차를 종합해 판정' : '해당 목차별 문장 묶음을 종합해 판정'}</small></div>
    <div class="ox-group">
      <button class="ox o ${state.result[type] === 'O' ? 'selected' : ''}" onclick="setResult('${type}','O')">O</button>
      <button class="ox x ${state.result[type] === 'X' ? 'selected' : ''}" onclick="setResult('${type}','X')">X</button>
    </div>
  </div>`;
}

function renderCompare() {
  const item = getPdf(state.activePdfId);
  const url = getPdfUrl(state.activePdfId);
  pageShell(`
    ${pdfSourceSelector('compare')}
    <section class="compare-layout">
      <article class="card answer-panel">
        <div class="panel-heading"><div><span class="eyebrow">내 답안</span><h2>${escapeHtml(state.issueTitle)}</h2></div><button class="secondary small" onclick="renderAnswer()">수정</button></div>
        <pre class="answer-preview">${escapeHtml(state.answer)}</pre>
      </article>
      <article class="card pdf-panel">
        <div class="panel-heading"><div><span class="eyebrow">PDF 원문</span><h2>${escapeHtml(item.name)}</h2></div><a class="secondary small link-button" href="${url}" target="_blank" rel="noopener">새 창</a></div>
        <object class="pdf-frame embedded" data="${url}" type="application/pdf"><div class="pdf-fallback"><a class="primary link-button" href="${url}" target="_blank" rel="noopener">PDF 열기</a></div></object>
      </article>
    </section>

    <section class="card judge-card">
      <div class="section-heading"><h2>직접 판정</h2><span>원문과 답안을 확인한 뒤 선택</span></div>
      ${resultButtons('outline', '목차')}
      ${state.scope === '모든 내용' ? resultButtons('prose', '줄글') : ''}
      <div class="policy-box">목차 또는 줄글 중 하나라도 X이면, 일부 항목만이 아니라 <strong>현재 논점 전체</strong>를 오답 논점으로 처리합니다.</div>
      <button class="primary large" onclick="finishJudgement()">판정 완료</button>
    </section>
  `, { backAction: 'renderAnswer()', title: '원문 비교', subtitle: '자동채점 없이 직접 확인합니다.', wide: true });
}

function finishJudgement() {
  const required = state.scope === '모든 내용' ? ['outline', 'prose'] : ['outline'];
  if (required.some(key => !state.result[key])) {
    alert('목차와 필요한 줄글 판정을 모두 선택하세요.');
    return;
  }
  const isWrong = required.some(key => state.result[key] === 'X');
  if (isWrong && !state.wrongIssues.includes(state.issueTitle.trim())) state.wrongIssues.push(state.issueTitle.trim());
  state.completedCount += 1;
  state.sessionResults.push({
    issueTitle: state.issueTitle.trim(), outline: state.result.outline,
    prose: state.result.prose, isWrong, pdfId: state.activePdfId
  });
  renderResult(isWrong);
}

function renderResult(isWrong) {
  pageShell(`
    <section class="card result-card ${isWrong ? 'wrong' : 'correct'}">
      <div class="result-symbol">${isWrong ? 'X' : 'O'}</div>
      <p class="eyebrow">판정 결과</p><h2>${escapeHtml(state.issueTitle)}</h2>
      <p>${isWrong ? 'X가 포함되어 현재 논점 전체가 오답 논점으로 처리되었습니다.' : '선택한 시험 범위를 모두 맞은 것으로 처리했습니다.'}</p>
      <div class="result-summary">
        <div><span>목차</span><strong>${state.result.outline}</strong></div>
        ${state.scope === '모든 내용' ? `<div><span>줄글</span><strong>${state.result.prose}</strong></div>` : ''}
        <div><span>누적 오답 논점</span><strong>${state.wrongIssues.length}개</strong></div>
      </div>
      <button class="primary large" onclick="newIssue()">다음 논점 작성</button>
      <button class="secondary large" onclick="renderSessionSummary()">시험 종료</button>
    </section>
  `, { title: '시험 결과', subtitle: isWrong ? '오답 논점 전체 재출제 원칙 적용' : '직접 판정 완료' });
}

function renderSessionSummary() {
  const total = state.sessionResults.length;
  const wrong = state.sessionResults.filter(item => item.isWrong).length;
  const correct = total - wrong;
  const rate = total ? Math.round((correct / total) * 100) : 0;
  pageShell(`
    <section class="card result-card">
      <p class="eyebrow">현재 시험 요약</p><h2>${total}개 논점 완료</h2>
      <p>이 결과는 현재 브라우저 세션에서만 확인하는 임시 요약입니다.</p>
      <div class="result-summary">
        <div><span>정답 논점</span><strong>${correct}개</strong></div>
        <div><span>오답 논점</span><strong>${wrong}개</strong></div>
        <div><span>정답률</span><strong>${rate}%</strong></div>
      </div>
      ${total ? `<div class="session-list">${state.sessionResults.map((item, index) => `<div class="session-row"><div><span>${index + 1}</span><strong>${escapeHtml(item.issueTitle)}</strong></div><b class="${item.isWrong ? 'wrong-text' : 'correct-text'}">${item.isWrong ? 'X' : 'O'}</b></div>`).join('')}</div>` : ''}
      <button class="primary large" onclick="startTest()">새 시험 시작</button>
      <button class="secondary large" onclick="renderMain()">메인으로</button>
    </section>
  `, { title: '시험 종료', subtitle: '현재 시험 결과를 확인합니다.' });
}

function newIssue() {
  state.issueTitle = '';
  state.answer = '';
  state.result = { outline: null, prose: null };
  renderAnswer();
}

window.addEventListener('beforeunload', revokePdfUrls);
(async function init() {
  await loadPdfData();
  renderMain();
})();
