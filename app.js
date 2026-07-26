const screens = {
  home: document.getElementById("home-screen"),
  settings: document.getElementById("settings-screen"),
  question: document.getElementById("question-screen"),
  preview: document.getElementById("answer-preview-screen"),
};

const sampleTopics = [
  {
    subject: "행정법",
    chapter: "8장 행정의 실효성 확보수단",
    number: "8-2",
    title: "대집행",
    grade: "A",
  },
  {
    subject: "행정법",
    chapter: "13장 국가책임",
    number: "13-1",
    title: "국가배상",
    grade: "A",
  },
  {
    subject: "행정법",
    chapter: "행정소송",
    number: "11-4",
    title: "집행정지",
    grade: "B",
  },
  {
    subject: "토지보상법",
    chapter: "손실보상",
    number: "3-2",
    title: "재결전치주의",
    grade: "A",
  },
  {
    subject: "부동산공시법",
    chapter: "부동산 가격공시",
    number: "2-1",
    title: "표준지공시지가",
    grade: "B",
  },
  {
    subject: "감정평가법",
    chapter: "감정평가사",
    number: "1-3",
    title: "감정평가사의 의무",
    grade: "C",
  },
];

let currentSettings = null;
let currentTopic = null;

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)]
    .map((input) => input.value);
}

function chooseTopic() {
  const candidates = sampleTopics.filter(
    (topic) =>
      currentSettings.subjects.includes(topic.subject) &&
      currentSettings.grades.includes(topic.grade)
  );

  const pool = candidates.length ? candidates : sampleTopics;
  const alternatives = currentTopic
    ? pool.filter((topic) => topic.number !== currentTopic.number)
    : pool;

  const finalPool = alternatives.length ? alternatives : pool;
  currentTopic = finalPool[Math.floor(Math.random() * finalPool.length)];
  renderQuestion();
}

function renderQuestion() {
  document.getElementById("topic-grade").textContent = currentTopic.grade;
  document.getElementById("topic-subject").textContent = currentTopic.subject;
  document.getElementById("topic-number").textContent = currentTopic.number;
  document.getElementById("topic-title").textContent = currentTopic.title;
  document.getElementById("topic-chapter").textContent = currentTopic.chapter;
  document.getElementById("selected-range").textContent = currentSettings.range;
  document.getElementById("range-description").textContent =
    currentSettings.range === "목차 전체"
      ? "해당 논점의 마지막 목차 수준까지 작성"
      : "목차 전체와 줄글까지 작성";

  document.getElementById("answer-input").value = "";
  document.getElementById("answer-input").focus();
}

document.getElementById("start-button").addEventListener("click", () => {
  showScreen("settings");
});

document.getElementById("settings-back-button").addEventListener("click", () => {
  showScreen("home");
});

document.getElementById("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const subjects = getCheckedValues("subject");
  const grades = getCheckedValues("grade");
  const range = document.querySelector('input[name="range"]:checked')?.value;
  const error = document.getElementById("settings-error");

  if (!subjects.length) {
    error.textContent = "과목을 하나 이상 선택하세요.";
    return;
  }

  if (!grades.length) {
    error.textContent = "등급을 하나 이상 선택하세요.";
    return;
  }

  error.textContent = "";
  currentSettings = { subjects, grades, range };
  currentTopic = null;
  chooseTopic();
  showScreen("question");
});

document.getElementById("question-back-button").addEventListener("click", () => {
  showScreen("settings");
});

document.getElementById("new-topic-button").addEventListener("click", () => {
  chooseTopic();
});

document.getElementById("show-answer-button").addEventListener("click", () => {
  document.getElementById("preview-topic").textContent =
    `${currentTopic.subject} · ${currentTopic.number} · ${currentTopic.title}`;
  document.getElementById("preview-range").textContent =
    `시험범위: ${currentSettings.range}`;
  showScreen("preview");
});

document.getElementById("return-question-button").addEventListener("click", () => {
  showScreen("question");
});
