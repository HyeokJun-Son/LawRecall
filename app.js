const app = document.getElementById('app');

const state = {
  mode: '법규',
  categories: new Set(['행정법']),
  grades: new Set(['A']),
  scope: '목차 전체',
  pdfFiles: {},
  pdfUrls: {},
  activePdfCategory: '행정법',
  issueTitle: '',
  answer: '',
  result: { outline: null, prose: null },
  wrongIssues: [],
  completedCount: 0,
  sessionResults: []
};

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

const PDF_CATEGORIES = ['행정법', '토지보상법', '부동산공시법', '감정평가법'];
const DB_NAME = 'LawRecallDB';
const DB_VERSION = 1;
const PDF_STORE = 'pdfFiles';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDF_STORE)) db.createObjectStore(PDF_STORE, { keyPath: 'category' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadSavedPdfs() {
  try {
    const db = await openDb();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_STORE, 'readonly');
      const req = tx.objectStore(PDF_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    records.forEach(record => { state.pdfFiles[record.category] = record.file; });
    db.close();
  } catch (error) {
    console.error('저장된 PDF를 불러오지 못했습니다.', error);
  }
}

async function savePdf(category, file) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readwrite');
    tx.objectStore(PDF_STORE).put({ category, file, savedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function deletePdf(category) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readwrite');
    tx.objectStore(PDF_STORE).delete(category);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  if (state.pdfUrls[category]) URL.revokeObjectURL(state.pdfUrls[category]);
  delete state.pdfUrls[category];
  delete state.pdfFiles[category];
  renderSetup();
}

function revokePdfUrls() {
  Object.values(state.pdfUrls).forEach(url => URL.revokeObjectURL(url));
  state.pdfUrls = {};
}

function getPdfUrl(category) {
  const file = state.pdfFiles[category];
  if (!file) return null;
  if (!state.pdfUrls[category]) state.pdfUrls[category] = URL.createObjectURL(file);
  return state.pdfUrls[category];
}

function currentPdfFile() {
  return state.pdfFiles[state.activePdfCategory] || null;
}

function currentPdfUrl() {
  return getPdfUrl(state.activePdfCategory);
}

function chip(label, selected, onClick, extraClass = '') {
  return `<button type="button" class="chip ${selected ? 'selected' : ''} ${extraClass}" onclick="${onClick}">${label}</button>`;
}

function pageShell(content, options = {}) {
  const { backAction = '', title = '', subtitle = '', wide = false } = options;
  app.innerHTML = `
    <main class="page ${wide ? 'wide' : ''}">
      <header class="topbar">
        ${backAction ? `<button class="icon-button" onclick="${backAction}" aria-label="뒤로가기">←</button>` : '<span></span>'}
        <div class="topbar-title">
          ${title ? `<h1>${title}</h1>` : ''}
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        <span></span>
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
      <p class="muted">답안을 작성한 뒤 보유한 PDF 원문을 보면서 직접 O/X를 판정합니다.</p>
      <button class="primary large" onclick="renderSetup()">시험 시작</button>
    </section>
    <section class="card compact info-card">
      <h3>현재 방식</h3>
      <div class="info-row"><span>원문</span><strong>과목별로 한 번 등록한 PDF</strong></div>
      <div class="info-row"><span>채점</span><strong>자동채점 없이 직접 O/X</strong></div>
      <div class="info-row"><span>저장</span><strong>기기 브라우저에만 보관</strong></div>
    </section>
  `, { title: '' });
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

async function handlePdfFile(input, category) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    alert('PDF 파일만 선택할 수 있습니다.');
    input.value = '';
    return;
  }
  try {
    if (state.pdfUrls[category]) URL.revokeObjectURL(state.pdfUrls[category]);
    delete state.pdfUrls[category];
    await savePdf(category, file);
    state.pdfFiles[category] = file;
    renderSetup();
  } catch (error) {
    console.error(error);
    alert('PDF를 기기에 저장하지 못했습니다. 브라우저 저장공간 권한을 확인하세요.');
  }
}

function pdfLibraryCard(category) {
  const file = state.pdfFiles[category];
  return `<div class="pdf-library-row ${file ? 'registered' : ''}">
    <div class="pdf-library-copy">
      <strong>${category}</strong>
      <small>${file ? `${escapeHtml(file.name)} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : '등록된 PDF 없음'}</small>
    </div>
    <div class="pdf-library-actions">
      <label class="secondary small pdf-register-button">
        ${file ? '변경' : '등록'}
        <input type="file" accept="application/pdf,.pdf" onchange="handlePdfFile(this,'${category}')">
      </label>
      ${file ? `<button type="button" class="text-danger small" onclick="deletePdf('${category}')">삭제</button>` : ''}
    </div>
  </div>`;
}

function renderSetup() {
  const categories = ['행정법', '토지보상법', '부동산공시법', '감정평가법'];
  const grades = [
    ['A', '빈출'], ['B', '출제'], ['C', '출제 가능'], ['D', '불의타']
  ];

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
          ${categories.map(c => chip(c, state.categories.has(c), `toggleSet('categories','${c}')`)).join('')}
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>논점 등급</h2><span>복수 선택 가능</span></div>
        <div class="chip-grid grade-grid">
          ${grades.map(([g, d]) => chip(`<b>${g}</b><small>${d}</small>`, state.grades.has(g), `toggleSet('grades','${g}')`, `grade-${g.toLowerCase()}`)).join('')}
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>시험 범위</h2><span>하나 선택</span></div>
        <div class="scope-grid">
          <button type="button" class="scope-card ${state.scope === '목차 전체' ? 'selected' : ''}" onclick="selectScope('목차 전체')">
            <strong>목차 전체</strong>
            <span>각 논점의 마지막 목차 수준까지 작성</span>
          </button>
          <button type="button" class="scope-card ${state.scope === '모든 내용' ? 'selected' : ''}" onclick="selectScope('모든 내용')">
            <strong>모든 내용</strong>
            <span>목차 전체와 해당 줄글까지 작성</span>
          </button>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><h2>과목별 원문 PDF</h2><span>최초 1회 등록</span></div>
        <div class="pdf-library">${PDF_CATEGORIES.map(pdfLibraryCard).join('')}</div>
        <p class="privacy-note">등록한 PDF는 이 기기의 현재 브라우저 저장공간에 보관됩니다. GitHub나 외부 서버로 전송되지 않으며, 브라우저 데이터 삭제 시 다시 등록해야 합니다.</p>
      </div>

      ${(() => { const missing=[...state.categories].filter(c=>!state.pdfFiles[c]); return `<button class="primary large" onclick="startTest()" ${missing.length ? 'disabled' : ''}>시험 시작</button>${missing.length ? `<p class="validation-note">선택한 과목의 PDF를 먼저 등록하세요: ${missing.join(', ')}</p>` : ''}`; })()}
    </section>
  `, { backAction: 'renderMain()', title: '시험 설정', subtitle: '원문 PDF를 기준으로 직접 비교합니다.' });
}

function startTest() {
  const selected = [...state.categories];
  const missing = selected.filter(category => !state.pdfFiles[category]);
  if (missing.length) {
    alert(`선택한 과목의 PDF를 먼저 등록하세요: ${missing.join(', ')}`);
    return;
  }
  if (!selected.includes(state.activePdfCategory)) state.activePdfCategory = selected[0];
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

function setActivePdfCategory(category) {
  state.activePdfCategory = category;
  renderAnswer();
}

function renderAnswer() {
  const tags = [state.mode, ...state.categories, ...[...state.grades].map(g => `${g}급`), state.scope];
  const pdfFile = currentPdfFile();
  pageShell(`
    <section class="test-meta card compact">
      <div>
        <div class="progress-label">${state.completedCount + 1}번째 논점</div>
        <div class="tag-row">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
      <div class="pdf-name">원문: <strong>${escapeHtml(pdfFile.name)}</strong></div>
    </section>

    ${state.categories.size > 1 ? `<section class="card compact source-selector"><strong>비교할 원문</strong><div class="tag-row">${[...state.categories].map(c => `<button class="source-chip ${state.activePdfCategory===c?'selected':''}" onclick="setActivePdfCategory('${c}')">${c}</button>`).join('')}</div></section>` : ''}

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

  const textarea = document.getElementById('answerText');
  textarea.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') completeAnswer();
  });
}

function openPdfPreview() {
  persistDraft();
  const pdfFile = currentPdfFile();
  const pdfUrl = currentPdfUrl();
  pageShell(`
    <section class="pdf-toolbar card compact">
      <div><strong>${escapeHtml(pdfFile.name)}</strong><small> 브라우저 PDF 도구로 페이지 이동·확대 가능</small></div>
      <button class="primary small" onclick="renderAnswer()">답안으로 돌아가기</button>
    </section>
    <section class="pdf-frame-wrap">
      <object class="pdf-frame" data="${pdfUrl}" type="application/pdf">
        <div class="pdf-fallback card">
          <p>이 브라우저에서는 PDF 미리보기를 표시하지 못했습니다.</p>
          <a class="primary link-button" href="${pdfUrl}" target="_blank" rel="noopener">새 창에서 PDF 열기</a>
        </div>
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
  return `
    <div class="judge-row">
      <div><strong>${label}</strong><small>${type === 'outline' ? '모든 수준의 목차를 종합해 판정' : '해당 목차별 문장 묶음을 종합해 판정'}</small></div>
      <div class="ox-group">
        <button class="ox o ${state.result[type] === 'O' ? 'selected' : ''}" onclick="setResult('${type}','O')">O</button>
        <button class="ox x ${state.result[type] === 'X' ? 'selected' : ''}" onclick="setResult('${type}','X')">X</button>
      </div>
    </div>`;
}

function renderCompare() {
  const pdfFile = currentPdfFile();
  const pdfUrl = currentPdfUrl();
  pageShell(`
    <section class="compare-layout">
      <article class="card answer-panel">
        <div class="panel-heading">
          <div><span class="eyebrow">내 답안</span><h2>${escapeHtml(state.issueTitle)}</h2></div>
          <button class="secondary small" onclick="renderAnswer()">수정</button>
        </div>
        <pre class="answer-preview">${escapeHtml(state.answer)}</pre>
      </article>

      <article class="card pdf-panel">
        <div class="panel-heading">
          <div><span class="eyebrow">PDF 원문</span><h2>${escapeHtml(pdfFile.name)}</h2></div>
          <a class="secondary small link-button" href="${pdfUrl}" target="_blank" rel="noopener">새 창</a>
        </div>
        <object class="pdf-frame embedded" data="${pdfUrl}" type="application/pdf">
          <div class="pdf-fallback"><a class="primary link-button" href="${pdfUrl}" target="_blank" rel="noopener">PDF 열기</a></div>
        </object>
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
  if (required.some(k => !state.result[k])) {
    alert('목차와 필요한 줄글 판정을 모두 선택하세요.');
    return;
  }

  const isWrong = required.some(k => state.result[k] === 'X');
  if (isWrong && !state.wrongIssues.includes(state.issueTitle.trim())) {
    state.wrongIssues.push(state.issueTitle.trim());
  }
  state.completedCount += 1;
  state.sessionResults.push({
    issueTitle: state.issueTitle.trim(),
    outline: state.result.outline,
    prose: state.result.prose,
    isWrong
  });
  renderResult(isWrong);
}

function renderResult(isWrong) {
  pageShell(`
    <section class="card result-card ${isWrong ? 'wrong' : 'correct'}">
      <div class="result-symbol">${isWrong ? 'X' : 'O'}</div>
      <p class="eyebrow">판정 결과</p>
      <h2>${escapeHtml(state.issueTitle)}</h2>
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
      <p class="eyebrow">현재 시험 요약</p>
      <h2>${total}개 논점 완료</h2>
      <p>이 결과는 현재 브라우저 세션에서만 확인하는 임시 요약입니다.</p>
      <div class="result-summary">
        <div><span>정답 논점</span><strong>${correct}개</strong></div>
        <div><span>오답 논점</span><strong>${wrong}개</strong></div>
        <div><span>정답률</span><strong>${rate}%</strong></div>
      </div>
      ${total ? `<div class="session-list">${state.sessionResults.map((item, index) => `
        <div class="session-row">
          <div><span>${index + 1}</span><strong>${escapeHtml(item.issueTitle)}</strong></div>
          <b class="${item.isWrong ? 'wrong-text' : 'correct-text'}">${item.isWrong ? 'X' : 'O'}</b>
        </div>`).join('')}</div>` : ''}
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
  await loadSavedPdfs();
  renderMain();
})();
