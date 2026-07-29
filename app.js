const app = document.getElementById('app');

const state = {
  mode: '법규',
  categories: new Set(['행정법']),
  grades: new Set(['A']),
  scope: '목차 전체',
  pdfFile: null,
  pdfUrl: null,
  issueTitle: '',
  answer: '',
  result: { outline: null, prose: null },
  wrongIssues: []
};

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function revokePdfUrl() {
  if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
  state.pdfUrl = null;
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
      <div class="info-row"><span>원문</span><strong>기기에서 직접 선택한 PDF</strong></div>
      <div class="info-row"><span>채점</span><strong>자동채점 없이 직접 O/X</strong></div>
      <div class="info-row"><span>저장</span><strong>PDF는 서버에 업로드하지 않음</strong></div>
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

function handlePdfFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    alert('PDF 파일만 선택할 수 있습니다.');
    input.value = '';
    return;
  }
  revokePdfUrl();
  state.pdfFile = file;
  state.pdfUrl = URL.createObjectURL(file);
  renderSetup();
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
        <div class="section-heading"><h2>원문 PDF</h2><span>기기 내부에서만 사용</span></div>
        <label class="file-picker ${state.pdfFile ? 'has-file' : ''}">
          <input type="file" accept="application/pdf,.pdf" onchange="handlePdfFile(this)">
          <span class="file-icon">PDF</span>
          <span class="file-copy">
            <strong>${state.pdfFile ? escapeHtml(state.pdfFile.name) : 'PDF 파일 선택'}</strong>
            <small>${state.pdfFile ? `${(state.pdfFile.size / 1024 / 1024).toFixed(1)} MB · 다시 누르면 변경` : '보유한 원문 PDF를 선택하세요'}</small>
          </span>
        </label>
        <p class="privacy-note">선택한 PDF는 브라우저에서만 열리며 GitHub나 외부 서버로 전송하지 않습니다.</p>
      </div>

      <button class="primary large" onclick="startTest()" ${state.pdfFile ? '' : 'disabled'}>시험 시작</button>
      ${!state.pdfFile ? '<p class="validation-note">시험을 시작하려면 원문 PDF를 먼저 선택하세요.</p>' : ''}
    </section>
  `, { backAction: 'renderMain()', title: '시험 설정', subtitle: '원문 PDF를 기준으로 직접 비교합니다.' });
}

function startTest() {
  if (!state.pdfFile || !state.pdfUrl) {
    alert('원문 PDF를 먼저 선택하세요.');
    return;
  }
  state.issueTitle = '';
  state.answer = '';
  state.result = { outline: null, prose: null };
  renderAnswer();
}

function persistDraft() {
  const issue = document.getElementById('issueTitle');
  const answer = document.getElementById('answerText');
  if (issue) state.issueTitle = issue.value;
  if (answer) state.answer = answer.value;
}

function renderAnswer() {
  const tags = [state.mode, ...state.categories, ...[...state.grades].map(g => `${g}급`), state.scope];
  pageShell(`
    <section class="test-meta card compact">
      <div class="tag-row">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="pdf-name">원문: <strong>${escapeHtml(state.pdfFile.name)}</strong></div>
    </section>

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
  pageShell(`
    <section class="pdf-toolbar card compact">
      <div><strong>${escapeHtml(state.pdfFile.name)}</strong><small> 브라우저 PDF 도구로 페이지 이동·확대 가능</small></div>
      <button class="primary small" onclick="renderAnswer()">답안으로 돌아가기</button>
    </section>
    <section class="pdf-frame-wrap">
      <object class="pdf-frame" data="${state.pdfUrl}" type="application/pdf">
        <div class="pdf-fallback card">
          <p>이 브라우저에서는 PDF 미리보기를 표시하지 못했습니다.</p>
          <a class="primary link-button" href="${state.pdfUrl}" target="_blank" rel="noopener">새 창에서 PDF 열기</a>
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
          <div><span class="eyebrow">PDF 원문</span><h2>${escapeHtml(state.pdfFile.name)}</h2></div>
          <a class="secondary small link-button" href="${state.pdfUrl}" target="_blank" rel="noopener">새 창</a>
        </div>
        <object class="pdf-frame embedded" data="${state.pdfUrl}" type="application/pdf">
          <div class="pdf-fallback"><a class="primary link-button" href="${state.pdfUrl}" target="_blank" rel="noopener">PDF 열기</a></div>
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
      <button class="secondary" onclick="renderSetup()">시험 설정으로 돌아가기</button>
    </section>
  `, { title: '시험 결과', subtitle: isWrong ? '오답 논점 전체 재출제 원칙 적용' : '직접 판정 완료' });
}

function newIssue() {
  state.issueTitle = '';
  state.answer = '';
  state.result = { outline: null, prose: null };
  renderAnswer();
}

window.addEventListener('beforeunload', revokePdfUrl);
renderMain();
