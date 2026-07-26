
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
  settings: document.getElementById("settingsScreen"),
  question: document.getElementById("questionScreen"),
  result: document.getElementById("resultScreen")
};

const state = {
  settings: null,
  topic: null,
  grades: {}
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
      <h4 class="outline-title">${item.outline}</h4>
      ${showBody ? `<p class="model-body">${item.body}</p>` : ""}
      ${scoreRow(item.id, "outline", "목차")}
      ${showBody ? scoreRow(item.id, "body", "줄글") : ""}
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
      <button class="score-button correct" type="button"
        data-item="${itemId}" data-type="${type}" data-value="true">O 맞음</button>
      <button class="score-button wrong" type="button"
        data-item="${itemId}" data-type="${type}" data-value="false">X 틀림</button>
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

function completeGrading() {
  if (completedCount() !== requiredCount()) return;

  let outlineO = 0, outlineX = 0, bodyO = 0, bodyX = 0;
  Object.values(state.grades).forEach(item => {
    item.outline ? outlineO++ : outlineX++;
    if (state.settings.range === "모든 내용") {
      item.body ? bodyO++ : bodyX++;
    }
  });

  const summary = document.getElementById("resultSummary");
  summary.innerHTML = `
    <div class="summary-box">목차 O<strong>${outlineO}</strong></div>
    <div class="summary-box">목차 X<strong>${outlineX}</strong></div>
    ${state.settings.range === "모든 내용" ? `
      <div class="summary-box">줄글 O<strong>${bodyO}</strong></div>
      <div class="summary-box">줄글 X<strong>${bodyX}</strong></div>
    ` : ""}
  `;
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

document.getElementById("startBtn").addEventListener("click", startTest);
document.getElementById("revealBtn").addEventListener("click", openAnswerPanel);
document.getElementById("closeAnswerBtn").addEventListener("click", closeAnswerPanel);
document.getElementById("completeBtn").addEventListener("click", completeGrading);
document.getElementById("nextBtn").addEventListener("click", nextTopic);
document.getElementById("backSettingsBtn").addEventListener("click", () => showScreen("settings"));
document.getElementById("homeBtn").addEventListener("click", () => showScreen("settings"));
