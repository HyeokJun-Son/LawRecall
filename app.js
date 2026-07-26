const screens = {
  home: document.getElementById("home-screen"),
  settings: document.getElementById("settings-screen"),
  question: document.getElementById("question-screen"),
};

const sampleTopics = [
  {
    subject: "행정법",
    chapter: "8장 행정의 실효성 확보수단",
    number: "8-2",
    title: "대집행",
    grade: "A",
    answer: [
      {
        outline: "Ⅰ. 대집행의 의의",
        body: "대집행은 행정대집행법에 따라 대체적 작위의무를 의무자가 이행하지 않은 경우, 행정청이 스스로 또는 제3자로 하여금 이를 행하게 하고 그 비용을 의무자로부터 징수하는 행정상 강제집행 수단이다."
      },
      {
        outline: "Ⅱ. 대집행의 요건",
        body: "1. 법령 또는 행정행위에 의하여 직접 명령된 대체적 작위의무가 존재할 것\n2. 의무자가 이를 이행하지 않을 것\n3. 다른 수단으로 그 이행을 확보하기 곤란할 것\n4. 불이행을 방치함이 심히 공익을 해할 것"
      },
      {
        outline: "Ⅲ. 대집행의 절차",
        body: "계고, 대집행영장에 의한 통지, 대집행의 실행, 비용징수의 순서로 진행된다."
      },
      {
        outline: "Ⅳ. 권리구제",
        body: "계고와 대집행영장에 의한 통지는 처분성이 인정될 수 있으며, 취소소송과 집행정지 등을 통한 권리구제가 문제된다."
      }
    ]
  },
  {
    subject: "행정법",
    chapter: "13장 국가책임",
    number: "13-1",
    title: "국가배상",
    grade: "A",
    answer: [
      {
        outline: "Ⅰ. 국가배상제도의 의의",
        body: "공무원의 위법한 직무행위 또는 공공시설의 설치·관리상 하자로 국민에게 손해가 발생한 경우 국가나 지방자치단체가 이를 배상하는 제도이다."
      },
      {
        outline: "Ⅱ. 공무원의 위법한 직무행위로 인한 배상책임",
        body: "공무원이 직무를 집행하면서 고의 또는 과실로 법령을 위반하여 타인에게 손해를 가한 경우 국가배상책임이 성립한다."
      },
      {
        outline: "Ⅲ. 영조물의 설치·관리상 하자로 인한 책임",
        body: "도로·하천 기타 공공의 영조물의 설치 또는 관리에 하자가 있어 타인에게 손해를 발생하게 한 경우 국가 또는 지방자치단체가 배상책임을 부담한다."
      }
    ]
  },
  {
    subject: "행정법",
    chapter: "행정소송",
    number: "11-4",
    title: "집행정지",
    grade: "B",
    answer: [
      {
        outline: "Ⅰ. 의의",
        body: "집행정지는 처분 등의 집행이나 절차의 속행으로 생길 회복하기 어려운 손해를 예방하기 위하여 법원이 잠정적으로 효력을 정지하는 제도이다."
      },
      {
        outline: "Ⅱ. 요건",
        body: "본안소송의 계속, 회복하기 어려운 손해를 예방하기 위한 긴급한 필요, 공공복리에 중대한 영향을 미칠 우려가 없을 것이 요구된다."
      },
      {
        outline: "Ⅲ. 효과",
        body: "법원의 결정 범위에서 처분의 효력, 집행 또는 절차의 속행이 정지된다."
      }
    ]
  },
  {
    subject: "토지보상법",
    chapter: "손실보상",
    number: "3-2",
    title: "재결전치주의",
    grade: "A",
    answer: [
      {
        outline: "Ⅰ. 의의",
        body: "토지수용으로 인한 보상금 증감소송은 원칙적으로 관할 토지수용위원회의 재결을 거친 후 제기하도록 하는 구조를 가진다."
      },
      {
        outline: "Ⅱ. 취지",
        body: "전문기관의 선행 판단을 거치게 함으로써 분쟁을 신속하고 전문적으로 해결하고 소송의 쟁점을 정리하려는 데 취지가 있다."
      },
      {
        outline: "Ⅲ. 소송상 쟁점",
        body: "재결의 존재, 제소기간, 당사자 및 청구형태가 주요 쟁점이 된다."
      }
    ]
  },
  {
    subject: "부동산공시법",
    chapter: "부동산 가격공시",
    number: "2-1",
    title: "표준지공시지가",
    grade: "B",
    answer: [
      {
        outline: "Ⅰ. 의의",
        body: "표준지공시지가는 국토교통부장관이 조사·평가하여 공시하는 표준지의 단위면적당 적정가격이다."
      },
      {
        outline: "Ⅱ. 기능",
        body: "개별공시지가 산정의 기준이 되고, 토지시장에 가격정보를 제공하며 각종 행정목적의 기준으로 활용된다."
      }
    ]
  },
  {
    subject: "감정평가법",
    chapter: "감정평가사",
    number: "1-3",
    title: "감정평가사의 의무",
    grade: "C",
    answer: [
      {
        outline: "Ⅰ. 성실의무",
        body: "감정평가사는 전문성과 독립성을 유지하며 공정하고 성실하게 감정평가업무를 수행하여야 한다."
      },
      {
        outline: "Ⅱ. 비밀엄수의무",
        body: "업무상 알게 된 비밀을 정당한 사유 없이 누설하거나 부당하게 이용하여서는 안 된다."
      },
      {
        outline: "Ⅲ. 금지행위",
        body: "명의대여, 부당한 보수 수수 및 공정성을 해치는 행위 등이 제한된다."
      }
    ]
  }
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

function closeModelAnswer() {
  const workspace = document.querySelector(".answer-workspace");
  const panel = document.getElementById("model-answer-panel");
  workspace.classList.remove("answer-open");
  panel.setAttribute("aria-hidden", "true");
}

function renderModelAnswer() {
  document.getElementById("answer-topic-number").textContent = currentTopic.number;
  document.getElementById("answer-topic-title").textContent = currentTopic.title;

  const container = document.getElementById("model-answer-content");
  container.innerHTML = "";

  currentTopic.answer.forEach((section) => {
    const wrapper = document.createElement("section");
    wrapper.className = "answer-section";

    const outline = document.createElement("h4");
    outline.className = "answer-outline";
    outline.textContent = section.outline;

    const body = document.createElement("p");
    body.className = "answer-body";
    body.textContent = section.body;

    wrapper.append(outline, body);
    container.appendChild(wrapper);
  });
}

function renderQuestion() {
  closeModelAnswer();
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
  renderModelAnswer();
  const workspace = document.querySelector(".answer-workspace");
  const panel = document.getElementById("model-answer-panel");
  workspace.classList.add("answer-open");
  panel.setAttribute("aria-hidden", "false");
});

document.getElementById("close-answer-button").addEventListener("click", () => {
  closeModelAnswer();
});
