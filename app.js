
const topics = [
  {
    subject: "행정법",
    grade: "A",
    chapter: "8장 행정의 실효성 확보수단",
    number: "8-2",
    title: "대집행",
    items: [
      {
        id: "o1",
        outline: "Ⅰ. 대집행의 의의",
        body: "대집행은 대체적 작위의무를 의무자가 이행하지 않는 경우 행정청이 스스로 또는 제3자로 하여금 그 의무를 이행하게 하고 그 비용을 의무자로부터 징수하는 행정상 강제집행 수단이다."
      },
      {
        id: "o2",
        outline: "Ⅱ. 대집행의 요건",
        body: "법령에 의하여 직접 명령되거나 법령에 따른 행정청의 명령에 의한 대체적 작위의무가 존재하고, 다른 수단으로 그 이행을 확보하기 곤란하며, 불이행을 방치함이 심히 공익을 해할 것이 요구된다."
      },
      {
        id: "o3",
        outline: "Ⅲ. 대집행의 절차",
        body: "계고, 대집행영장에 의한 통지, 대집행의 실행, 비용징수의 순서로 진행된다. 비상시 또는 위험이 절박한 경우에는 일부 절차가 생략될 수 있다."
      },
      {
        id: "o4",
        outline: "Ⅳ. 권리구제",
        body: "계고와 대집행영장 통지 등 처분성이 인정되는 단계에 대해서는 취소소송 및 집행정지를 검토할 수 있고, 위법한 대집행으로 손해가 발생하면 국가배상청구가 문제될 수 있다."
      }
    ]
  },
  {
    subject: "행정법",
    grade: "A",
    chapter: "3장 행정법의 일반원칙",
    number: "3-7",
    title: "신뢰보호 원칙",
    items: [
      {
        id: "o1",
        outline: "Ⅰ. 의의 및 근거",
        body: "행정청의 공적 견해표명을 신뢰하여 일정한 행위를 한 국민의 보호가치 있는 신뢰를 보호하는 원칙이며, 법치국가원리와 신의성실의 원칙 등을 근거로 한다."
      },
      {
        id: "o2",
        outline: "Ⅱ. 요건",
        body: "행정청의 공적 견해표명, 상대방의 귀책사유 부존재, 신뢰에 기초한 처리행위, 견해표명에 반하는 후행처분, 인과관계 및 보호가치 있는 신뢰가 요구된다."
      },
      {
        id: "o3",
        outline: "Ⅲ. 한계",
        body: "신뢰보호는 법률적합성의 원칙, 공익 또는 제3자의 정당한 이익과 비교형량되어야 하며, 사정변경이 있는 경우 제한될 수 있다."
      }
    ]
  },
  {
    subject: "토지보상법",
    grade: "B",
    chapter: "손실보상 일반론",
    number: "1-1",
    title: "손실보상의 의의",
    items: [
      {
        id: "o1",
        outline: "Ⅰ. 의의",
        body: "공공필요에 의한 적법한 공권력 행사로 특정인에게 특별한 희생이 발생한 경우 그 손실을 공평부담의 견지에서 전보하는 제도이다."
      },
      {
        id: "o2",
        outline: "Ⅱ. 근거",
        body: "헌법상 재산권 보장과 특별희생에 대한 조절적 보상의 요청을 근거로 한다."
      }
    ]
  }
];

const screens = {
  home: document.getElementById("homeScreen"),
  settings: document.getElementById("settingsScreen"),
  question: document.getElementById("questionScreen"),
  history: document.getElementById("historyScreen"),
  historyDetail: document.getElementById("historyDetailScreen"),
  statistics: document.getElementById("statisticsScreen"),
  review: document.getElementById("reviewScreen"),
  statisticsDetail: document.getElementById("statisticsDetailScreen"),
  result: document.getElementById("resultScreen")
};

const STORAGE_KEY = "lawRecallGradingRecords";

const state = {
  settings: null,
  topic: null,
  grades: {},
  savedRecordId: null
};

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function selectedValues(containerId) {
  return [...document.querySelectorAll(`#${containerId} input:checked`)].map(input => input.value);
}

function startTest() {
  const subjects = selectedValues("subjectOptions");
  const grades = selectedValues("gradeOptions");
  const range = document.querySelector('input[name="range"]:checked')?.value;
  const error = document.getElementById("settingsError");

  if (!subjects.length || !grades.length) {
    error.textContent = "과목과 등급을 각각 하나 이상 선택하세요.";
    return;
  }

  const pool = topics.filter(t => subjects.includes(t.subject) && grades.includes(t.grade));
  if (!pool.length) {
    error.textContent = "현재 샘플 데이터에는 해당 조합의 논점이 없습니다.";
    return;
  }

  error.textContent = "";
  state.settings = { subjects, grades, range };
  loadTopic(pool[Math.floor(Math.random() * pool.length)]);
}

function loadTopic(topic) {
  state.topic = topic;
  state.grades = {};
  state.savedRecordId = null;

  document.getElementById("subjectBadge").textContent = topic.subject;
  document.getElementById("gradeBadge").textContent = `${topic.grade}급`;
  document.getElementById("rangeBadge").textContent = state.settings.range;
  document.getElementById("chapterText").textContent = topic.chapter;
  document.getElementById("topicNumber").textContent = topic.number;
  document.getElementById("topicTitle").textContent = topic.title;
  document.getElementById("userAnswer").value = "";

  closeAnswerPanel();
  renderGradingList();
  showScreen("question");
}

function renderGradingList() {
  const list = document.getElementById("gradingList");
  const showBody = state.settings.range === "모든 내용";
  list.innerHTML = "";

  state.topic.items.forEach((item, index) => {
    const wrapper = document.createElement("article");
    wrapper.className = "grading-item";
    wrapper.innerHTML = `
      <div class="grading-line outline-line">
        <h4 class="outline-title">${item.outline}</h4>
        ${scoreRow(item.id, "outline", "목차")}
      </div>
      ${showBody ? `
        <div class="grading-line body-line">
          <p class="model-body">${item.body}</p>
          ${scoreRow(item.id, "body", "줄글")}
        </div>
      ` : ""}
    `;
    list.appendChild(wrapper);
  });

  list.querySelectorAll(".score-button").forEach(button => {
    button.addEventListener("click", () => {
      setGrade(button.dataset.item, button.dataset.type, button.dataset.value === "true");
    });
  });

  updateCompletionState();
}

function scoreRow(itemId, type, label) {
  return `
    <div class="score-row" data-row="${itemId}-${type}">
      <div class="score-label">${label}</div>
      <div class="score-actions">
        <button class="score-button correct" type="button"
          data-item="${itemId}" data-type="${type}" data-value="true">O</button>
        <button class="score-button wrong" type="button"
          data-item="${itemId}" data-type="${type}" data-value="false">X</button>
      </div>
    </div>
  `;
}

function setGrade(itemId, type, value) {
  if (!state.grades[itemId]) state.grades[itemId] = {};
  state.grades[itemId][type] = value;

  const row = document.querySelector(`[data-row="${itemId}-${type}"]`);
  row.querySelectorAll(".score-button").forEach(btn => {
    btn.classList.toggle("selected", (btn.dataset.value === "true") === value);
  });

  updateCompletionState();
}

function requiredCount() {
  const perItem = state.settings.range === "모든 내용" ? 2 : 1;
  return state.topic.items.length * perItem;
}

function completedCount() {
  let count = 0;
  Object.values(state.grades).forEach(item => {
    if (typeof item.outline === "boolean") count += 1;
    if (state.settings.range === "모든 내용" && typeof item.body === "boolean") count += 1;
  });
  return count;
}

function updateCompletionState() {
  const complete = completedCount();
  const required = requiredCount();
  const button = document.getElementById("completeBtn");
  const status = document.getElementById("gradingStatus");

  button.disabled = complete !== required;
  status.textContent = complete === required
    ? "모든 항목의 채점이 완료되었습니다."
    : `${required - complete}개 항목을 더 채점하세요.`;
}

function openAnswerPanel() {
  const layout = document.getElementById("answerLayout");
  const panel = document.getElementById("modelPanel");
  layout.classList.add("answer-open");
  panel.setAttribute("aria-hidden", "false");
}

function closeAnswerPanel() {
  const layout = document.getElementById("answerLayout");
  const panel = document.getElementById("modelPanel");
  layout.classList.remove("answer-open");
  panel.setAttribute("aria-hidden", "true");
}

function getSavedRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error("채점 기록을 불러오지 못했습니다.", error);
    return [];
  }
}

function updateStoredCount() {
  const count = getSavedRecords().length;
  const element = document.getElementById("storedCount");
  if (element) element.textContent = `저장된 채점 기록 ${count}회`;
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTestedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function summarizeRecord(record) {
  const items = Array.isArray(record.items) ? record.items : [];
  let outlineO = 0;
  let outlineX = 0;
  let bodyO = 0;
  let bodyX = 0;

  items.forEach(item => {
    if (item.outlineCorrect === true) outlineO += 1;
    if (item.outlineCorrect === false) outlineX += 1;
    if (item.bodyCorrect === true) bodyO += 1;
    if (item.bodyCorrect === false) bodyX += 1;
  });

  const correctCount = outlineO + bodyO;
  const gradedCount = outlineO + outlineX + bodyO + bodyX;
  const accuracy = gradedCount > 0 ? Math.floor((correctCount / gradedCount) * 100) : 0;

  return { outlineO, outlineX, bodyO, bodyX, accuracy };
}

function openHistory() {
  renderHistoryList();
  showScreen("history");
}

function topicKey(record) {
  const topic = record.topic || {};
  return [topic.subject || "", topic.number || "", topic.title || ""].join("||");
}

function averageAccuracy(records) {
  if (!records.length) return 0;
  const total = records.reduce((sum, record) => sum + summarizeRecord(record).accuracy, 0);
  return Math.floor(total / records.length);
}

function groupRecordsByTopic() {
  const groups = new Map();
  getSavedRecords().forEach(record => {
    const key = topicKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  return [...groups.entries()].map(([key, records]) => {
    records.sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime());
    const latest = records[0];
    const recentRecords = records.slice(0, 5);
    return {
      key,
      topic: latest.topic || {},
      records,
      lastTestedAt: latest.testedAt,
      latestAccuracy: summarizeRecord(latest).accuracy,
      recentAccuracy: averageAccuracy(recentRecords),
      overallAccuracy: averageAccuracy(records)
    };
  }).sort((a, b) => new Date(b.lastTestedAt).getTime() - new Date(a.lastTestedAt).getTime());
}

function openStatistics() {
  renderStatisticsList();
  showScreen("statistics");
}

function daysSince(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const elapsed = Date.now() - date.getTime();
  return Math.max(0, Math.floor(elapsed / 86400000));
}

function reviewPriority(group) {
  const days = daysSince(group.lastTestedAt);
  const accuracyNeed = 100 - group.recentAccuracy;
  const inactivityNeed = Math.min(days, 30) * 2;
  const lowAttemptNeed = Math.max(0, 5 - group.records.length) * 6;
  return Math.round(accuracyNeed * 1.4 + inactivityNeed + lowAttemptNeed);
}

function reviewReason(group) {
  const days = daysSince(group.lastTestedAt);
  if (group.recentAccuracy < 70) return "최근 정답률이 낮아요";
  if (days >= 14) return "2주 이상 복습하지 않았어요";
  if (group.records.length < 3) return "시험 횟수가 아직 적어요";
  if (group.recentAccuracy < 90) return "정답률을 더 끌어올릴 수 있어요";
  return "기억 유지를 위한 복습 시점이에요";
}

function reviewLevel(score) {
  if (score >= 95) return { label: "최우선", stars: "★★★★★" };
  if (score >= 70) return { label: "높음", stars: "★★★★☆" };
  if (score >= 45) return { label: "보통", stars: "★★★☆☆" };
  return { label: "유지", stars: "★★☆☆☆" };
}

function getReviewGroups() {
  return groupRecordsByTopic()
    .map(group => ({ ...group, priority: reviewPriority(group) }))
    .sort((a, b) => b.priority - a.priority || new Date(a.lastTestedAt) - new Date(b.lastTestedAt));
}

function openReview() {
  renderReviewList();
  showScreen("review");
}

function renderReviewList() {
  const list = document.getElementById("reviewList");
  const summary = document.getElementById("reviewSummary");
  const groups = getReviewGroups();

  if (!groups.length) {
    summary.innerHTML = `<strong>추천을 만들 기록이 없습니다.</strong><p class="helper">시험을 완료하면 정답률과 학습 간격을 분석해 복습 논점을 추천합니다.</p>`;
    list.innerHTML = "";
    return;
  }

  const urgent = groups.filter(group => group.priority >= 70).length;
  summary.innerHTML = `
    <div><span>추천 논점</span><strong>${groups.length}개</strong></div>
    <div><span>우선 복습</span><strong>${urgent}개</strong></div>
    <p>점수가 높을수록 지금 복습할 필요가 큰 논점입니다.</p>
  `;

  list.innerHTML = groups.slice(0, 10).map((group, index) => {
    const topic = group.topic;
    const level = reviewLevel(group.priority);
    const days = daysSince(group.lastTestedAt);
    return `
      <article class="card review-card">
        <div class="review-rank">${index + 1}</div>
        <div class="review-content">
          <div class="review-heading-row">
            <div>
              <p class="history-subject">${escapeHtml(topic.subject || "과목 정보 없음")} · ${escapeHtml(topic.grade ? `${topic.grade}급` : "등급 정보 없음")}</p>
              <h3>${escapeHtml(topic.number || "")} ${escapeHtml(topic.title || "논점 정보 없음")}</h3>
            </div>
            <span class="review-level">${level.label}</span>
          </div>
          <p class="review-stars" aria-label="복습 우선순위 ${level.label}">${level.stars}</p>
          <p class="review-reason">${escapeHtml(reviewReason(group))}</p>
          <div class="review-metrics">
            <div><span>최근 정답률</span><strong>${group.recentAccuracy}%</strong></div>
            <div><span>미학습 기간</span><strong>${days === 0 ? "오늘" : `${days}일`}</strong></div>
            <div><span>시험 횟수</span><strong>${group.records.length}회</strong></div>
          </div>
          <button class="primary-button review-start-btn" type="button" data-topic-key="${escapeHtml(group.key)}">이 논점 시험 시작</button>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll(".review-start-btn").forEach(button => {
    button.addEventListener("click", () => startRecommendedTopic(button.dataset.topicKey));
  });
}

function startRecommendedTopic(key) {
  const group = groupRecordsByTopic().find(item => item.key === key);
  if (!group) return;
  const topic = topics.find(item =>
    item.subject === group.topic.subject &&
    item.number === group.topic.number &&
    item.title === group.topic.title
  );
  if (!topic) {
    window.alert("현재 시험 데이터에서 이 논점을 찾지 못했습니다.");
    return;
  }
  const latestRange = group.records[0]?.range;
  state.settings = {
    subjects: [topic.subject],
    grades: [topic.grade],
    range: latestRange === "목차 전체" ? "목차 전체" : "모든 내용"
  };
  loadTopic(topic);
}

function renderStatisticsList() {
  const list = document.getElementById("statisticsList");
  const groups = groupRecordsByTopic();

  if (!groups.length) {
    list.innerHTML = `
      <div class="card empty-history">
        <h3>아직 통계를 만들 기록이 없습니다.</h3>
        <p class="helper">같은 논점을 한 번 이상 시험하면 이곳에 통계가 표시됩니다.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = groups.map(group => {
    const topic = group.topic;
    return `
      <article class="card statistics-card">
        <div class="statistics-card-heading">
          <div>
            <p class="history-subject">${escapeHtml(topic.subject || "과목 정보 없음")} · ${escapeHtml(topic.grade ? `${topic.grade}급` : "등급 정보 없음")}</p>
            <h3>${escapeHtml(topic.number || "")} ${escapeHtml(topic.title || "논점 정보 없음")}</h3>
            <p class="history-chapter">${escapeHtml(topic.chapter || "")}</p>
          </div>
          <button class="secondary-button statistics-detail-btn" type="button" data-topic-key="${escapeHtml(group.key)}">기록 보기</button>
        </div>
        <div class="statistics-metrics">
          <div><span>최근 시험</span><strong>${escapeHtml(formatTestedAt(group.lastTestedAt))}</strong></div>
          <div><span>시험 횟수</span><strong>${group.records.length}회</strong></div>
          <div><span>최근 정답률</span><strong>${group.recentAccuracy}%</strong><small>최근 최대 5회 평균</small></div>
          <div><span>전체 정답률</span><strong>${group.overallAccuracy}%</strong></div>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll(".statistics-detail-btn").forEach(button => {
    button.addEventListener("click", () => openStatisticsDetail(button.dataset.topicKey));
  });
}

function openStatisticsDetail(key) {
  const group = groupRecordsByTopic().find(item => item.key === key);
  if (!group) {
    openStatistics();
    return;
  }

  const topic = group.topic;
  document.getElementById("statisticsDetailTitle").textContent = `${topic.number || ""} ${topic.title || "논점 통계"}`.trim();
  document.getElementById("statisticsDetailMeta").textContent = [
    topic.subject,
    topic.grade ? `${topic.grade}급` : "",
    topic.chapter
  ].filter(Boolean).join(" · ");

  const detail = document.getElementById("statisticsDetail");
  detail.innerHTML = `
    <div class="statistics-summary-grid">
      <div><span>시험 횟수</span><strong>${group.records.length}회</strong></div>
      <div><span>최근 정답률</span><strong>${group.recentAccuracy}%</strong></div>
      <div><span>전체 정답률</span><strong>${group.overallAccuracy}%</strong></div>
      <div><span>마지막 시험</span><strong>${escapeHtml(formatTestedAt(group.lastTestedAt))}</strong></div>
    </div>
    <div class="attempt-history">
      <h3>시험 기록</h3>
      ${group.records.map((record, index) => `
        <div class="attempt-row">
          <div>
            <strong>${index + 1}회 전</strong>
            <span>${escapeHtml(formatTestedAt(record.testedAt))}</span>
          </div>
          <span class="badge muted">${escapeHtml(record.range || "범위 정보 없음")}</span>
          <strong class="attempt-accuracy">${summarizeRecord(record).accuracy}%</strong>
        </div>
      `).join("")}
    </div>
  `;
  showScreen("statisticsDetail");
}

function renderHistoryList() {
  const list = document.getElementById("historyList");
  const records = [...getSavedRecords()].sort((a, b) =>
    new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()
  );

  if (!records.length) {
    list.innerHTML = `
      <div class="card empty-history">
        <h3>아직 저장된 기록이 없습니다.</h3>
        <p class="helper">시험을 완료하면 이곳에서 결과를 확인할 수 있습니다.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = records.map(record => {
    const summary = summarizeRecord(record);
    const topic = record.topic || {};
    return `
      <article class="card history-card" data-record-id="${escapeHtml(record.id)}">
        <div class="history-card-top">
          <time>${escapeHtml(formatTestedAt(record.testedAt))}</time>
          <span class="badge muted">${escapeHtml(record.range || "범위 정보 없음")}</span>
        </div>
        <p class="history-subject">${escapeHtml(topic.subject || "과목 정보 없음")} · ${escapeHtml(topic.grade ? `${topic.grade}급` : "등급 정보 없음")}</p>
        <h3>${escapeHtml(topic.number || "")} ${escapeHtml(topic.title || "논점 정보 없음")}</h3>
        <p class="history-chapter">${escapeHtml(topic.chapter || "")}</p>
        <div class="history-score-grid">
          <div><span>정답률</span><strong>${summary.accuracy}%</strong></div>
        </div>
        <div class="history-card-actions">
          <button class="secondary-button history-detail-btn" type="button" data-record-id="${escapeHtml(record.id)}">상세보기</button>
          <button class="delete-button history-delete-btn" type="button" data-record-id="${escapeHtml(record.id)}">삭제</button>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll(".history-detail-btn").forEach(button => {
    button.addEventListener("click", () => openHistoryDetail(button.dataset.recordId));
  });

  list.querySelectorAll(".history-delete-btn").forEach(button => {
    button.addEventListener("click", () => deleteHistoryRecord(button.dataset.recordId));
  });
}

function openHistoryDetail(recordId) {
  const record = getSavedRecords().find(item => item.id === recordId);
  if (!record) {
    renderHistoryList();
    showScreen("history");
    return;
  }

  const topic = record.topic || {};
  document.getElementById("detailTitle").textContent = `${topic.number || ""} ${topic.title || "학습 기록"}`.trim();
  document.getElementById("detailMeta").textContent = [
    formatTestedAt(record.testedAt),
    topic.subject,
    topic.grade ? `${topic.grade}급` : "",
    record.range
  ].filter(Boolean).join(" · ");

  const detail = document.getElementById("historyDetail");
  const items = Array.isArray(record.items) ? record.items : [];
  detail.innerHTML = `
    ${topic.chapter ? `<p class="detail-chapter">${escapeHtml(topic.chapter)}</p>` : ""}
    <div class="detail-items">
      ${items.map(item => `
        <article class="detail-item">
          <h3>${escapeHtml(item.outlineText || "목차 정보 없음")}</h3>
          <div class="detail-grade-row">
            <span>목차</span>
            <strong class="grade-pill ${item.outlineCorrect ? "grade-o" : "grade-x"}">${item.outlineCorrect ? "O" : "X"}</strong>
          </div>
          ${typeof item.bodyCorrect === "boolean" ? `
            <div class="detail-grade-row">
              <span>줄글</span>
              <strong class="grade-pill ${item.bodyCorrect ? "grade-o" : "grade-x"}">${item.bodyCorrect ? "O" : "X"}</strong>
            </div>
          ` : ""}
        </article>
      `).join("")}
    </div>
  `;
  showScreen("historyDetail");
}

function deleteHistoryRecord(recordId) {
  const record = getSavedRecords().find(item => item.id === recordId);
  const topic = record?.topic || {};
  const label = `${topic.number || ""} ${topic.title || "이 기록"}`.trim();
  if (!window.confirm(`${label}의 학습 기록을 삭제할까요?`)) return;

  try {
    const remaining = getSavedRecords().filter(item => item.id !== recordId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    updateStoredCount();
    renderHistoryList();
  } catch (error) {
    console.error("학습 기록을 삭제하지 못했습니다.", error);
    window.alert("기록을 삭제하지 못했습니다.");
  }
}

function buildGradingRecord() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    testedAt: new Date().toISOString(),
    topic: {
      subject: state.topic.subject,
      grade: state.topic.grade,
      chapter: state.topic.chapter,
      number: state.topic.number,
      title: state.topic.title
    },
    range: state.settings.range,
    items: state.topic.items.map(item => ({
      itemId: item.id,
      outlineText: item.outline,
      outlineCorrect: state.grades[item.id].outline,
      ...(state.settings.range === "모든 내용" ? { bodyCorrect: state.grades[item.id].body } : {})
    }))
  };
}

function saveCurrentGrading() {
  if (state.savedRecordId) return { saved: true, count: getSavedRecords().length };
  try {
    const records = getSavedRecords();
    const record = buildGradingRecord();
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    state.savedRecordId = record.id;
    updateStoredCount();
    return { saved: true, count: records.length };
  } catch (error) {
    console.error("채점 기록을 저장하지 못했습니다.", error);
    return { saved: false, count: getSavedRecords().length };
  }
}

function completeGrading() {
  if (completedCount() !== requiredCount()) return;

  let outlineO = 0, outlineX = 0, bodyO = 0, bodyX = 0;
  Object.values(state.grades).forEach(item => {
    item.outline ? outlineO++ : outlineX++;
    if (state.settings.range === "모든 내용") {
      item.body ? bodyO++ : bodyX++;
    }
  });

  const saveResult = saveCurrentGrading();
  const summary = document.getElementById("resultSummary");
  summary.innerHTML = `
    <div class="summary-box">목차 O<strong>${outlineO}</strong></div>
    <div class="summary-box">목차 X<strong>${outlineX}</strong></div>
    ${state.settings.range === "모든 내용" ? `
      <div class="summary-box">줄글 O<strong>${bodyO}</strong></div>
      <div class="summary-box">줄글 X<strong>${bodyX}</strong></div>
    ` : ""}
  `;

  const saveMessage = document.getElementById("saveMessage");
  saveMessage.className = saveResult.saved ? "save-message success" : "save-message error";
  saveMessage.textContent = saveResult.saved
    ? `채점 결과가 이 기기에 저장되었습니다. 누적 ${saveResult.count}회`
    : "채점 결과를 저장하지 못했습니다. 브라우저 저장 공간 설정을 확인하세요.";
  showScreen("result");
}

function nextTopic() {
  const pool = topics.filter(t =>
    state.settings.subjects.includes(t.subject) &&
    state.settings.grades.includes(t.grade)
  );

  let next = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1) {
    while (next.number === state.topic.number) {
      next = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  loadTopic(next);
}

document.getElementById("goSettingsBtn").addEventListener("click", () => showScreen("settings"));
document.getElementById("historyBtn").addEventListener("click", openHistory);
document.getElementById("statisticsBtn").addEventListener("click", openStatistics);
document.getElementById("reviewBtn").addEventListener("click", openReview);
document.getElementById("historyBackBtn").addEventListener("click", () => showScreen("home"));
document.getElementById("detailBackBtn").addEventListener("click", openHistory);
document.getElementById("statisticsBackBtn").addEventListener("click", () => showScreen("home"));
document.getElementById("reviewBackBtn").addEventListener("click", () => showScreen("home"));
document.getElementById("statisticsDetailBackBtn").addEventListener("click", openStatistics);
document.getElementById("startBtn").addEventListener("click", startTest);
document.getElementById("revealBtn").addEventListener("click", openAnswerPanel);
document.getElementById("closeAnswerBtn").addEventListener("click", closeAnswerPanel);
document.getElementById("completeBtn").addEventListener("click", completeGrading);
document.getElementById("nextBtn").addEventListener("click", nextTopic);
document.getElementById("backSettingsBtn").addEventListener("click", () => showScreen("settings"));
document.getElementById("homeBtn").addEventListener("click", () => showScreen("home"));

updateStoredCount();
