const screens = {
  home: document.getElementById("homeScreen"),
  settings: document.getElementById("settingsScreen"),
  preview: document.getElementById("previewScreen")
};

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("goSettingsBtn").addEventListener("click", () => {
  showScreen("settings");
});

document.getElementById("backBtn").addEventListener("click", () => {
  showScreen("home");
});

document.getElementById("editSettingsBtn").addEventListener("click", () => {
  showScreen("settings");
});

document.getElementById("testForm").addEventListener("submit", event => {
  event.preventDefault();

  const subject = document.querySelector('input[name="subject"]:checked').value;
  const range = document.querySelector('input[name="range"]:checked').value;
  const grades = [...document.querySelectorAll('input[name="grade"]:checked')]
    .map(input => input.value);

  if (grades.length === 0) {
    alert("논점 등급을 하나 이상 선택해 주세요.");
    return;
  }

  document.getElementById("summaryText").textContent =
    `과목: ${subject}\n등급: ${grades.join(", ")}\n시험 범위: ${range}`;

  showScreen("preview");
});

document.getElementById("nextStepBtn").addEventListener("click", () => {
  alert("다음 버전에서 실제 문제 화면을 연결합니다.");
});
