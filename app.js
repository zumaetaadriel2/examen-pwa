/**
 * QuizMaster PWA - Application Logic
 * Integración con preguntas.json (Examen Residentado Médico 2026)
 * Mobile-First Interactive Quiz, Fundamentos & PWA Life Cycle
 */

// =============================================================================
// 1. State Management
// =============================================================================
let QUIZ_DATA = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let deferredPrompt = null;
let isFundamentoVisible = false;

// DOM Elements
const currentQuestionNumEl = document.getElementById('currentQuestionNum');
const totalQuestionsNumEl = document.getElementById('totalQuestionsNum');
const progressBarEl = document.getElementById('progressBar');
const questionCategoryEl = document.getElementById('questionCategory');
const questionTitleEl = document.getElementById('questionTitle');
const optionsListEl = document.getElementById('optionsList');

const btnFundamento = document.getElementById('btnFundamento');
const btnFundamentoText = document.getElementById('btnFundamentoText');
const fundamentoCard = document.getElementById('fundamentoCard');
const fundamentoText = document.getElementById('fundamentoText');

const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnFinish = document.getElementById('btnFinish');
const btnRestart = document.getElementById('btnRestart');
const btnInstall = document.getElementById('btnInstall');

const quizSection = document.getElementById('quizSection');
const resultsSection = document.getElementById('resultsSection');
const scorePercentEl = document.getElementById('scorePercent');
const scoreFractionEl = document.getElementById('scoreFraction');
const statCorrectEl = document.getElementById('statCorrect');
const statIncorrectEl = document.getElementById('statIncorrect');
const statAccuracyEl = document.getElementById('statAccuracy');
const statStatusEl = document.getElementById('statStatus');

const networkStatusEl = document.getElementById('networkStatus');
const networkTextEl = document.getElementById('networkText');
const toastContainerEl = document.getElementById('toastContainer');
const toastMessageEl = document.getElementById('toastMessage');
const toastTextEl = document.getElementById('toastText');

// =============================================================================
// 2. Load Questions from preguntas.json
// =============================================================================
async function loadQuestions() {
  try {
    const response = await fetch('./preguntas.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    QUIZ_DATA = await response.json();
    userAnswers = new Array(QUIZ_DATA.length).fill(null);
    totalQuestionsNumEl.textContent = QUIZ_DATA.length;
    renderCurrentQuestion();
  } catch (error) {
    console.error('Error cargando preguntas.json:', error);
    questionTitleEl.textContent = 'Error al cargar las preguntas del examen. Asegúrate de tener conexión o haber cargado la app previamente.';
    showToast('⚠️ No se pudieron cargar las preguntas');
  }
}

// =============================================================================
// 3. UI Rendering Functions
// =============================================================================

/**
 * Render current question based on currentQuestionIndex
 */
function renderCurrentQuestion() {
  if (!QUIZ_DATA || QUIZ_DATA.length === 0) return;

  const currentQ = QUIZ_DATA[currentQuestionIndex];
  const totalQ = QUIZ_DATA.length;

  // 1. Update Progress Counter & Bar
  currentQuestionNumEl.textContent = currentQuestionIndex + 1;
  totalQuestionsNumEl.textContent = totalQ;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);
  progressBarEl.style.width = `${progressPercent}%`;
  progressBarEl.setAttribute('aria-valuenow', progressPercent);

  // 2. Update Question Content
  questionCategoryEl.textContent = `Pregunta ${currentQ.id} • Residentado Médico`;
  questionTitleEl.textContent = currentQ.pregunta;

  // 3. Reset Fundamento Card to collapsed state
  hideFundamento();
  fundamentoText.textContent = currentQ.fundamento || 'No hay fundamento disponible para esta pregunta.';

  // 4. Render Large Touch-Friendly Options
  optionsListEl.innerHTML = '';
  const optionLetters = ['A', 'B', 'C', 'D'];

  currentQ.opciones.forEach((rawOptionText, index) => {
    // Strip leading "A. ", "B. ", etc. if already present
    const cleanOptionText = rawOptionText.replace(/^[A-D]\.\s*/, '');
    const isSelected = userAnswers[currentQuestionIndex] === index;

    const optionBtn = document.createElement('button');
    optionBtn.type = 'button';
    optionBtn.className = `option-card ${isSelected ? 'selected' : ''}`;
    optionBtn.setAttribute('role', 'radio');
    optionBtn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    optionBtn.setAttribute('data-index', index);

    optionBtn.innerHTML = `
      <div class="option-badge">${optionLetters[index]}</div>
      <span class="option-text">${cleanOptionText}</span>
      <div class="option-radio" aria-hidden="true"></div>
    `;

    optionBtn.addEventListener('click', () => handleSelectOption(index));
    optionsListEl.appendChild(optionBtn);
  });

  // 5. Update Navigation Controls
  btnPrev.disabled = currentQuestionIndex === 0;

  const isLastQuestion = currentQuestionIndex === totalQ - 1;
  if (isLastQuestion) {
    btnNext.style.display = 'none';
    btnFinish.classList.add('visible');
  } else {
    btnNext.style.display = 'inline-flex';
    btnFinish.classList.remove('visible');
  }
}

/**
 * Handle user tapping an option card
 */
function handleSelectOption(selectedIndex) {
  userAnswers[currentQuestionIndex] = selectedIndex;

  const optionCards = optionsListEl.querySelectorAll('.option-card');
  optionCards.forEach((card, idx) => {
    const isNowSelected = idx === selectedIndex;
    card.classList.toggle('selected', isNowSelected);
    card.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
  });

  if ('vibrate' in navigator) {
    navigator.vibrate(25);
  }
}

/**
 * Toggle Fundamento (Explicación Oficial)
 */
function toggleFundamento() {
  if (isFundamentoVisible) {
    hideFundamento();
  } else {
    showFundamento();
  }
}

function showFundamento() {
  isFundamentoVisible = true;
  fundamentoCard.hidden = false;
  btnFundamento.classList.add('active');
  btnFundamento.setAttribute('aria-expanded', 'true');
  btnFundamentoText.textContent = 'Ocultar fundamento';
}

function hideFundamento() {
  isFundamentoVisible = false;
  fundamentoCard.hidden = true;
  btnFundamento.classList.remove('active');
  btnFundamento.setAttribute('aria-expanded', 'false');
  btnFundamentoText.textContent = 'Ver fundamento';
}

/**
 * Navigation Handlers
 */
function handleNext() {
  if (currentQuestionIndex < QUIZ_DATA.length - 1) {
    currentQuestionIndex++;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handlePrev() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Finalize quiz and compute results
 */
function handleFinishQuiz() {
  const unansweredCount = userAnswers.filter(ans => ans === null).length;
  if (unansweredCount > 0) {
    const confirmFinish = confirm(`Tienes ${unansweredCount} pregunta(s) sin responder de ${QUIZ_DATA.length}. ¿Deseas finalizar la prueba de todos modos?`);
    if (!confirmFinish) return;
  }

  let correctCount = 0;
  QUIZ_DATA.forEach((q, idx) => {
    if (userAnswers[idx] === q.respuestaCorrecta) {
      correctCount++;
    }
  });

  const total = QUIZ_DATA.length;
  const incorrectCount = total - correctCount;
  const percentage = Math.round((correctCount / total) * 100);

  scorePercentEl.textContent = `${percentage}%`;
  scoreFractionEl.textContent = `${correctCount} de ${total} preguntas correctas`;
  statCorrectEl.textContent = correctCount;
  statIncorrectEl.textContent = incorrectCount;
  statAccuracyEl.textContent = `${percentage}%`;

  if (percentage >= 80) {
    statStatusEl.textContent = "Excelente";
    statStatusEl.style.color = "var(--success)";
  } else if (percentage >= 60) {
    statStatusEl.textContent = "Aprobado";
    statStatusEl.style.color = "var(--accent-cyan)";
  } else {
    statStatusEl.textContent = "Repasar";
    statStatusEl.style.color = "var(--warning)";
  }

  quizSection.style.display = 'none';
  resultsSection.classList.add('active');
  resultsSection.setAttribute('aria-hidden', 'false');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Restart quiz
 */
function handleRestartQuiz() {
  currentQuestionIndex = 0;
  userAnswers = new Array(QUIZ_DATA.length).fill(null);
  resultsSection.classList.remove('active');
  resultsSection.setAttribute('aria-hidden', 'true');
  quizSection.style.display = 'flex';
  renderCurrentQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================================================
// 4. Toast Notifications
// =============================================================================
let toastTimeout;
function showToast(message, duration = 3500) {
  clearTimeout(toastTimeout);
  toastTextEl.textContent = message;
  toastMessageEl.classList.add('show');

  toastTimeout = setTimeout(() => {
    toastMessageEl.classList.remove('show');
  }, duration);
}

// =============================================================================
// 5. Network Connectivity Listeners
// =============================================================================
function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (isOnline) {
    networkStatusEl.classList.remove('offline');
    networkTextEl.textContent = 'En línea';
    showToast('🟢 Conexión a internet restablecida');
  } else {
    networkStatusEl.classList.add('offline');
    networkTextEl.textContent = 'Sin conexión';
    showToast('⚠️ Modo offline activado. La app sigue funcionando.');
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

if (!navigator.onLine) {
  networkStatusEl.classList.add('offline');
  networkTextEl.textContent = 'Sin conexión';
}

// =============================================================================
// 6. PWA Installation Event Handling
// =============================================================================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.classList.add('visible');
});

btnInstall.addEventListener('click', async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('🎉 ¡Gracias por instalar QuizMaster PWA!');
  }
  deferredPrompt = null;
  btnInstall.classList.remove('visible');
});

window.addEventListener('appinstalled', () => {
  showToast('📱 QuizMaster ha sido instalada en tu dispositivo');
  btnInstall.classList.remove('visible');
});

// =============================================================================
// 7. Service Worker Registration
// =============================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado con scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] Error al registrar Service Worker:', error);
      });
  });
}

// =============================================================================
// 8. Event Listeners & Initialization
// =============================================================================
btnFundamento.addEventListener('click', toggleFundamento);
btnPrev.addEventListener('click', handlePrev);
btnNext.addEventListener('click', handleNext);
btnFinish.addEventListener('click', handleFinishQuiz);
btnRestart.addEventListener('click', handleRestartQuiz);

// Initialize Questions
loadQuestions();
