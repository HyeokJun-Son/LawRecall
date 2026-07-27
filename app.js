"use strict";

const DB = window.MASTER_DB || { subjects: [], chapters: [], topics: [] };
const topics = DB.topics || [];
const chapters = DB.chapters || [];
const STORAGE_KEY = "lawRecallGradingRecords";

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedValues(containerId) {
  return [...document.querySelectorAll(`#${containerId} input:checked`)].map(input => input.value);
}

function renderSubjectOptions() {
  const subjects = DB.subjects?.length ? DB.subjects : [...new Set(topics.map(topic => topic.subject))];
  document.getElementById("subjectOptions").innerHTML = subjects.map((subject, index) => `
    <label><input type="checkbox" value="${escapeHtml(subject)}" ${index === 0 ? "checked" : ""}><span>${escapeHtml(subject)}</span></label>
  `).join("");
}

function renderChapterOptions() {
  const subjects = selectedValues("subjectOptions");
  const selectedBefore = new Set(selectedValues("chapterOptions"));
  const visible = chapters
    .filter(chapter => subjects.includes(chapter.subject))
    .sort((a, b) => a.sort_order - b.sort_order);

  document.getElementById("chapterOptions").innerHTML = visible.map(chapter => {
    const checked = selectedBefore.size === 0 || selectedBefore.has(chapter.chapter_id);
    return `
      <label class="chapter-option">
        <input type="checkbox" value="${escapeHtml(chapter.chapter_id)}" ${checked ? "checked" : ""}>
        <span><strong>${escapeHtml(chapter.subject)}</strong> · ${escapeHtml(chapter.chapter_no)}장 ${escapeHtml(chapter.chapter_name)}</span>
      </label>`;
  }).join("");
  updatePoolCount();
}

function currentSettingsFromForm() {
  return {
    subjects: selectedValues("subjectOptions"),
    grades: selectedValues("gradeOptions"),
    chapters: selectedValues("chapterOptions"),
    range: document.querySelector('input[name="range"]:checked')?.value || "목차 전체"
  };
}

function topicPool(settings = currentSettingsFromForm()) {
  return topics.filter(topic =>
    settings.subjects.includes(topic.subject) &&
    settings.grades.includes(topic.grade) &&
    settings.chapters.includes(topic.chapter_id)
  );
}

function updatePoolCount() {
  const settings = currentSettingsFromForm();
  const count = settings.subjects.length && settings.grades.length && settings.chapters.length
    ? topicPool(settings).length : 0;
  document.getElementById("poolCount").textContent = `현재 조건에서 출제 가능한 논점 ${count}개`;
}

function startTest() {
  const settings = currentSettingsFromForm();
  const error = document.getElementById("settingsError");
  if (!settings.subjects.length) return void (error.textContent = "과목을 하나 이상 선택하세요.");
  if (!settings.grades.length) return void (error.textContent = "등급을 하나 이상 선택하세요.");
  if (!settings.chapters.length) return void (error.textContent = "단원을 하나 이상 선택하세요.");
  const pool = topicPool(settings);
  if (!pool.length) return void (error.textContent = "선택한 조건에 해당하는 논점이 없습니다.");
  error.textContent = "";
  state.settings = settings;
  loadTopic(pool[Math.floor(Math.random() * pool.length)]);
}

function topicItems(topic) {
  return (topic.outlines || []).map(item => ({
    id: item.outline_id,
    outline: item.outline_title,
    level: Number(item.level || 1),
    parentId: item.parent_outline_id || null
  }));
}

function loadTopic(topic) {
  state.topic = { ...topic, items: topicItems(topic) };
  state.grades = {};
  state.savedRecordId = null;
  document.getElementById("subjectBadge").textContent = topic.subject;
  document.getElementById("gradeBadge").textContent = `${topic.grade}급`;
  document.getElementById("rangeBadge").textContent = state.settings.range;
  document.getElementById("chapterText").textContent = `${topic.chapter_name}`;
  document.getElementById("topicNumber").textContent = topic.topic_no;
  document.getElementById("topicTitle").textContent = topic.topic_title;
  document.getElementById("userAnswer").value = "";
  document.getElementById("answerLayout").classList.remove("answer-open");
  document.getElementById("modelPanel").setAttribute("aria-hidden", "true");
  renderGradingList();
  updateCompletionState();
  showScreen("question");
}

function scoreRow(itemId, type, label) {
  return `
    <div class="score-row">
      <div class="score-label">${label}</div>
      <button class="score-button correct" data-item-id="${escapeHtml(itemId)}" data-type="${type}" data-value="true" type="button">O</button>
      <button class="score-button wrong" data-item-id="${escapeHtml(itemId)}" data-type="${type}" data-value="false" type="button">X</button>
    </div>`;
}

function renderGradingList() {
  const bodyEnabled = state.settings.range === "모든 내용";
  document.getElementById("gradingList").innerHTML = state.topic.items.map(item => `
    <article class="grading-item" data-level="${item.level}">
      <h4 class="outline-title level-${item.level}" style="--outline-level:${item.level}">
        <span class="level-chip">${item.level}수준</span>${escapeHtml(item.outline)}
      </h4>
      ${scoreRow(item.id, "outline", "목차")}
      ${bodyEnabled ? `
        <p class="model-body pending-body">줄글 원문은 v1.1 PDF 연동 예정입니다. 현재는 기본서 또는 PDF와 비교한 뒤 직접 채점하세요.</p>
        ${scoreRow(item.id, "body", "줄글")}
      ` : ""}
    </article>`).join("");

  document.querySelectorAll(".score-button").forEach(button => {
    button.addEventListener("click", () => setGrade(
      button.dataset.itemId,
      button.dataset.type,
      button.dataset.value === "true"
    ));
  });
}

function setGrade(itemId, type, value) {
  state.grades[itemId] ||= {};
  state.grades[itemId][type] = value;
  document.querySelectorAll(`.score-button[data-item-id="${CSS.escape(itemId)}"][data-type="${type}"]`).forEach(button => {
    button.classList.toggle("selected", (button.dataset.value === "true") === value);
  });
  updateCompletionState();
}

function requiredCount() {
  return state.topic.items.length * (state.settings.range === "모든 내용" ? 2 : 1);
}

function completedCount() {
  return state.topic.items.reduce((count, item) => {
    const grade = state.grades[item.id] || {};
    return count + (typeof grade.outline === "boolean" ? 1 : 0)
      + (state.settings.range === "모든 내용" && typeof grade.body === "boolean" ? 1 : 0);
  }, 0);
}

function updateCompletionState() {
  const required = state.topic ? requiredCount() : 0;
  const completed = state.topic ? completedCount() : 0;
  const completeBtn = document.getElementById("completeBtn");
  completeBtn.disabled = completed !== required;
  document.getElementById("gradingStatus").textContent = completed === required
    ? "모든 항목을 채점했습니다."
    : `${completed}/${required} 항목 채점 완료`;
}

function openAnswerPanel() {
  document.getElementById("answerLayout").classList.add("answer-open");
  document.getElementById("modelPanel").setAttribute("aria-hidden", "false");
}

function closeAnswerPanel() {
  document.getElementById("answerLayout").classList.remove("answer-open");
  document.getElementById("modelPanel").setAttribute("aria-hidden", "true");
}

function topicByLegacyRecord(record) {
  const info = record.topic || {};
  if (info.topicId) return topics.find(topic => topic.topic_id === info.topicId);
  return topics.find(topic =>
    topic.subject === info.subject &&
    String(topic.topic_no) === String(info.number) &&
    topic.topic_title === info.title
  );
}

function migrateRecords(records) {
  let changed = false;
  const migrated = records.map(record => {
    const matched = topicByLegacyRecord(record);
    if (!matched || record.topic?.topicId) return record;
    changed = true;
    return {
      ...record,
      topic: {
        ...record.topic,
        topicId: matched.topic_id,
        chapterId: matched.chapter_id,
        chapter: matched.chapter_name,
        number: matched.topic_no,
        title: matched.topic_title
      }
    };
  });
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

function getSavedRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? migrateRecords(parsed) : [];
  } catch (error) {
    console.error("저장된 기록을 읽지 못했습니다.", error);
    return [];
  }
}

function updateStoredCount() {
  document.getElementById("storedCount").textContent = `저장된 채점 기록 ${getSavedRecords().length}회 · DB 논점 ${topics.length}개`;
}

function formatTestedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function summarizeRecord(record) {
  let correct = 0;
  let total = 0;
  (record.items || []).forEach(item => {
    if (typeof item.outlineCorrect === "boolean") { total++; if (item.outlineCorrect) correct++; }
    if (typeof item.bodyCorrect === "boolean") { total++; if (item.bodyCorrect) correct++; }
  });
  return { correct, total, accuracy: total ? Math.round(correct / total * 100) : 0 };
}

function topicKey(record) {
  return record.topic?.topicId || `${record.topic?.subject}|${record.topic?.number}|${record.topic?.title}`;
}

function averageAccuracy(records) {
  if (!records.length) return 0;
  return Math.round(records.reduce((sum, record) => sum + summarizeRecord(record).accuracy, 0) / records.length);
}

function groupRecordsByTopic() {
  const groups = new Map();
  getSavedRecords().forEach(record => {
    const key = topicKey(record);
    if (!groups.has(key)) groups.set(key, { key, records: [], topic: record.topic });
    groups.get(key).records.push(record);
  });
  return [...groups.values()].map(group => {
    group.records.sort((a, b) => new Date(b.testedAt) - new Date(a.testedAt));
    const matched = topicByLegacyRecord(group.records[0]);
    if (matched) group.topic = {
      ...group.topic,
      topicId: matched.topic_id,
      subject: matched.subject,
      grade: matched.grade,
      chapter: matched.chapter_name,
      chapterId: matched.chapter_id,
      number: matched.topic_no,
      title: matched.topic_title
    };
    group.latest = group.records[0];
    group.recentAccuracy = averageAccuracy(group.records.slice(0, 5));
    group.overallAccuracy = averageAccuracy(group.records);
    return group;
  });
}

function openHistory() { renderHistoryList(); showScreen("history"); }
function openStatistics() { renderStatisticsList(); showScreen("statistics"); }
function openReview() { renderReviewList(); showScreen("review"); }

function renderHistoryList() {
  const records = getSavedRecords().sort((a, b) => new Date(b.testedAt) - new Date(a.testedAt));
  const list = document.getElementById("historyList");
  if (!records.length) {
    list.innerHTML = '<div class="card empty-state">아직 저장된 학습 기록이 없습니다.</div>';
    return;
  }
  list.innerHTML = records.map(record => {
    const summary = summarizeRecord(record);
    return `
      <article class="card history-card">
        <div class="history-card-main">
          <div class="history-card-title">${escapeHtml(record.topic?.number)} ${escapeHtml(record.topic?.title)}</div>
          <div class="history-card-meta">${escapeHtml(record.topic?.subject)} · ${escapeHtml(record.topic?.grade || "-")}급 · ${escapeHtml(record.range)} · ${formatTestedAt(record.testedAt)}</div>
        </div>
        <strong class="accuracy-value">${summary.accuracy}%</strong>
        <div class="history-card-actions">
          <button class="ghost-button history-detail-button" data-record-id="${escapeHtml(record.id)}" type="button">상세</button>
          <button class="danger-button history-delete-button" data-record-id="${escapeHtml(record.id)}" type="button">삭제</button>
        </div>
      </article>`;
  }).join("");
  document.querySelectorAll(".history-detail-button").forEach(btn => btn.addEventListener("click", () => openHistoryDetail(btn.dataset.recordId)));
  document.querySelectorAll(".history-delete-button").forEach(btn => btn.addEventListener("click", () => deleteHistoryRecord(btn.dataset.recordId)));
}

function openHistoryDetail(recordId) {
  const record = getSavedRecords().find(item => item.id === recordId);
  if (!record) return openHistory();
  document.getElementById("detailTitle").textContent = `${record.topic?.number} ${record.topic?.title}`;
  document.getElementById("detailMeta").textContent = `${record.topic?.subject} · ${record.topic?.chapter || ""} · ${record.range} · ${formatTestedAt(record.testedAt)}`;
  document.getElementById("historyDetail").innerHTML = (record.items || []).map(item => `
    <div class="detail-item">
      <strong>${escapeHtml(item.outlineText)}</strong>
      <div class="detail-badges">
        <span class="result-pill ${item.outlineCorrect ? "correct" : "wrong"}">목차 ${item.outlineCorrect ? "O" : "X"}</span>
        ${typeof item.bodyCorrect === "boolean" ? `<span class="result-pill ${item.bodyCorrect ? "correct" : "wrong"}">줄글 ${item.bodyCorrect ? "O" : "X"}</span>` : ""}
      </div>
    </div>`).join("");
  showScreen("historyDetail");
}

function deleteHistoryRecord(recordId) {
  if (!confirm("이 학습 기록을 삭제할까요?")) return;
  const records = getSavedRecords().filter(record => record.id !== recordId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  updateStoredCount();
  renderHistoryList();
}

function renderStatisticsList() {
  const groups = groupRecordsByTopic().sort((a, b) => new Date(b.latest.testedAt) - new Date(a.latest.testedAt));
  const list = document.getElementById("statisticsList");
  if (!groups.length) {
    list.innerHTML = '<div class="card empty-state">통계를 만들 학습 기록이 없습니다.</div>';
    return;
  }
  list.innerHTML = groups.map(group => `
    <article class="card statistics-card">
      <div>
        <div class="statistics-title">${escapeHtml(group.topic?.number)} ${escapeHtml(group.topic?.title)}</div>
        <div class="history-card-meta">${escapeHtml(group.topic?.subject)} · ${escapeHtml(group.topic?.grade || "-")}급 · 최근 ${formatTestedAt(group.latest.testedAt)}</div>
      </div>
      <div class="statistics-metrics">
        <span>시험 <strong>${group.records.length}회</strong></span>
        <span>최근 <strong>${group.recentAccuracy}%</strong></span>
        <span>전체 <strong>${group.overallAccuracy}%</strong></span>
      </div>
      <button class="ghost-button statistics-detail-button" data-topic-key="${escapeHtml(group.key)}" type="button">기록 보기</button>
    </article>`).join("");
  document.querySelectorAll(".statistics-detail-button").forEach(btn => btn.addEventListener("click", () => openStatisticsDetail(btn.dataset.topicKey)));
}

function openStatisticsDetail(key) {
  const group = groupRecordsByTopic().find(item => item.key === key);
  if (!group) return openStatistics();
  document.getElementById("statisticsDetailTitle").textContent = `${group.topic?.number} ${group.topic?.title}`;
  document.getElementById("statisticsDetailMeta").textContent = `${group.topic?.subject} · 시험 ${group.records.length}회 · 최근 5회 ${group.recentAccuracy}%`;
  document.getElementById("statisticsDetail").innerHTML = group.records.map((record, index) => {
    const summary = summarizeRecord(record);
    return `<div class="statistics-record-row"><span>${index + 1}. ${formatTestedAt(record.testedAt)} · ${escapeHtml(record.range)}</span><strong>${summary.accuracy}%</strong></div>`;
  }).join("");
  showScreen("statisticsDetail");
}

function daysSince(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function reviewPriority(group) {
  const accuracyScore = 100 - group.recentAccuracy;
  const staleScore = Math.min(daysSince(group.latest.testedAt) * 3, 60);
  const frequencyScore = Math.max(0, 24 - group.records.length * 4);
  return Math.round(accuracyScore * 0.6 + staleScore * 0.25 + frequencyScore * 0.15);
}

function reviewReason(group) {
  const reasons = [];
  if (group.recentAccuracy < 70) reasons.push("최근 정답률 낮음");
  if (daysSince(group.latest.testedAt) >= 14) reasons.push(`${daysSince(group.latest.testedAt)}일 미학습`);
  if (group.records.length <= 2) reasons.push("시험 횟수 적음");
  return reasons.length ? reasons.join(" · ") : "정기 복습 권장";
}

function renderReviewList() {
  const groups = groupRecordsByTopic().map(group => ({ ...group, priority: reviewPriority(group) }))
    .sort((a, b) => b.priority - a.priority).slice(0, 10);
  document.getElementById("reviewSummary").innerHTML = `<strong>오늘의 추천</strong><span>저장된 기록을 기준으로 우선순위가 높은 논점 ${groups.length}개를 표시합니다.</span>`;
  const list = document.getElementById("reviewList");
  if (!groups.length) {
    list.innerHTML = '<div class="card empty-state">시험 기록이 생기면 복습 논점을 추천합니다.</div>';
    return;
  }
  list.innerHTML = groups.map((group, index) => `
    <article class="card review-card">
      <div class="review-rank">${index + 1}</div>
      <div class="review-main">
        <div class="review-title">${escapeHtml(group.topic?.number)} ${escapeHtml(group.topic?.title)}</div>
        <div class="history-card-meta">${escapeHtml(group.topic?.subject)} · 최근 ${group.recentAccuracy}% · ${daysSince(group.latest.testedAt)}일 전 · ${group.records.length}회</div>
        <div class="review-reason">${escapeHtml(reviewReason(group))}</div>
      </div>
      <button class="primary-button recommended-start-button" data-topic-key="${escapeHtml(group.key)}" type="button">이 논점 시험 시작</button>
    </article>`).join("");
  document.querySelectorAll(".recommended-start-button").forEach(btn => btn.addEventListener("click", () => startRecommendedTopic(btn.dataset.topicKey)));
}

function startRecommendedTopic(key) {
  const group = groupRecordsByTopic().find(item => item.key === key);
  const topic = group && topicByLegacyRecord(group.latest);
  if (!topic) return alert("Master DB에서 이 논점을 찾지 못했습니다.");
  state.settings = {
    subjects: [topic.subject], grades: [topic.grade], chapters: [topic.chapter_id], range: group.latest.range || "모든 내용"
  };
  loadTopic(topic);
}

function buildGradingRecord() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    testedAt: new Date().toISOString(),
    topic: {
      topicId: state.topic.topic_id,
      subject: state.topic.subject,
      grade: state.topic.grade,
      chapterId: state.topic.chapter_id,
      chapter: state.topic.chapter_name,
      number: state.topic.topic_no,
      title: state.topic.topic_title
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
    if (state.settings.range === "모든 내용") item.body ? bodyO++ : bodyX++;
  });
  const saveResult = saveCurrentGrading();
  document.getElementById("resultSummary").innerHTML = `
    <div class="summary-box">목차 O<strong>${outlineO}</strong></div>
    <div class="summary-box">목차 X<strong>${outlineX}</strong></div>
    ${state.settings.range === "모든 내용" ? `<div class="summary-box">줄글 O<strong>${bodyO}</strong></div><div class="summary-box">줄글 X<strong>${bodyX}</strong></div>` : ""}`;
  const message = document.getElementById("saveMessage");
  message.className = saveResult.saved ? "save-message success" : "save-message error";
  message.textContent = saveResult.saved ? `채점 결과가 이 기기에 저장되었습니다. 누적 ${saveResult.count}회` : "채점 결과를 저장하지 못했습니다.";
  showScreen("result");
}

function nextTopic() {
  const pool = topicPool(state.settings);
  if (!pool.length) return showScreen("settings");
  let next = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1) while (next.topic_id === state.topic.topic_id) next = pool[Math.floor(Math.random() * pool.length)];
  loadTopic(next);
}

function toggleAllChapters() {
  const boxes = [...document.querySelectorAll("#chapterOptions input")];
  const shouldCheck = boxes.some(box => !box.checked);
  boxes.forEach(box => { box.checked = shouldCheck; });
  document.getElementById("toggleAllChaptersBtn").textContent = shouldCheck ? "전체 해제" : "전체 선택";
  updatePoolCount();
}

renderSubjectOptions();
renderChapterOptions();
document.getElementById("subjectOptions").addEventListener("change", renderChapterOptions);
document.getElementById("gradeOptions").addEventListener("change", updatePoolCount);
document.getElementById("chapterOptions").addEventListener("change", updatePoolCount);
document.getElementById("toggleAllChaptersBtn").addEventListener("click", toggleAllChapters);
document.getElementById("goSettingsBtn").addEventListener("click", () => { renderChapterOptions(); showScreen("settings"); });
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
