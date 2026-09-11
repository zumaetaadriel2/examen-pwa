/**
 * QuizMaster PWA - Application Logic
 * Mobile-First Interactive Quiz & PWA Life Cycle
 */

// =============================================================================
// 1. Question Bank (Banco de Preguntas)
// =============================================================================
const QUIZ_DATA = [
  {
    id: 1,
    category: "PWA & Fundamentos",
    question: "¿Cuál es el componente principal que permite a una PWA funcionar sin conexión a internet (offline)?",
    options: [
      "WebSockets en tiempo real",
      "Service Worker",
      "LocalStorage con JSON",
      "Web Worker estándar"
    ],
    correct: 1
  },
  {
    id: 2,
    category: "Manifiesto Web",
    question: "¿Qué archivo define el nombre, iconos, color de tema y modo de visualización ('standalone') de una PWA?",
    options: [
      "config.xml",
      "package.json",
      "manifest.json",
      "sw-config.js"
    ],
    correct: 2
  },
  {
    id: 3,
    category: "Estrategias de Caché",
    question: "¿Qué estrategia de caché entrega primero el recurso almacenado en caché y sólo si falla consulta la red?",
    options: [
      "Network First (Red primero)",
      "Cache Only (Solo caché)",
      "Network Only (Solo red)",
      "Cache First (Caché primero con fallback a red)"
    ],
    correct: 3
  },
  {
    id: 4,
    category: "Diseño Mobile-First",
    question: "¿Cuál es el tamaño mínimo recomendado para objetivos táctiles (touch targets) en pantallas de celular?",
    options: [
      "Aproximadamente 48px x 48px",
      "10px x 10px",
      "24px x 24px",
      "72px x 72px"
    ],
    correct: 0
  },
  {
    id: 5,
    category: "Ciclo de Vida PWA",
    question: "¿Qué evento del navegador se intercepta para activar el banner o botón personalizado de instalación?",
    options: [
      "onappinstall",
      "beforeinstallprompt",
      "pwa:ready",
      "serviceWorkerActivated"
    ],
    correct: 1
  }
];

// =============================================================================
// 2. State Management
// =============================================================================
let currentQuestionIndex = 0;
let userAnswers = new Array(QUIZ_DATA.length).fill(null);
let deferredPrompt = null;

// DOM Elements
const currentQuestionNumEl = document.getElementById('currentQuestionNum');
const totalQuestionsNumEl = document.getElementById('totalQuestionsNum');
const progressBarEl = document.getElementById('progressBar');
const questionCategoryEl = document.getElementById('questionCategory');
const questionTitleEl = document.getElementById('questionTitle');
const optionsListEl = document.getElementById('optionsList');

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
// 3. UI Rendering Functions
// =============================================================================

/**
 * Render current question based on currentQuestionIndex
 */
function renderCurrentQuestion() {
  const currentQ = QUIZ_DATA[currentQuestionIndex];
  const totalQ = QUIZ_DATA.length;

  // 1. Update Progress Counter & Bar
  currentQuestionNumEl.textContent = currentQuestionIndex + 1;
  totalQuestionsNumEl.textContent = totalQ;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);
  progressBarEl.style.width = `${progressPercent}%`;
  progressBarEl.setAttribute('aria-valuenow', progressPercent);

  // 2. Update Question Content with soft animation
  questionCategoryEl.textContent = currentQ.category;
  questionTitleEl.textContent = currentQ.question;

  // 3. Render Large Touch-Friendly Options
  optionsListEl.innerHTML = '';
  const optionLetters = ['A', 'B', 'C', 'D'];

  currentQ.options.forEach((optionText, index) => {
    const isSelected = userAnswers[currentQuestionIndex] === index;

    const optionBtn = document.createElement('button');
    optionBtn.type = 'button';
    optionBtn.className = `option-card ${isSelected ? 'selected' : ''}`;
    optionBtn.setAttribute('role', 'radio');
    optionBtn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    optionBtn.setAttribute('data-index', index);

    optionBtn.innerHTML = `
      <div class="option-badge">${optionLetters[index]}</div>
      <span class="option-text">${optionText}</span>
      <div class="option-radio" aria-hidden="true"></div>
    `;

    optionBtn.addEventListener('click', () => handleSelectOption(index));
    optionsListEl.appendChild(optionBtn);
  });

  // 4. Update Navigation Controls
  // Anterior button
  btnPrev.disabled = currentQuestionIndex === 0;

  // Next vs Finish button
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

  // Update classes immediately for instant touch response
  const optionCards = optionsListEl.querySelectorAll('.option-card');
  optionCards.forEach((card, idx) => {
    const isNowSelected = idx === selectedIndex;
    card.classList.toggle('selected', isNowSelected);
    card.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
  });

  // Provide tactile vibration if supported on mobile device
  if ('vibrate' in navigator) {
    navigator.vibrate(25);
  }
}

/**
 * Navigate to next question
 */
function handleNext() {
  if (currentQuestionIndex < QUIZ_DATA.length - 1) {
    currentQuestionIndex++;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Navigate to previous question
 */
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
  // Check if there are unanswered questions
  const unansweredCount = userAnswers.filter(ans => ans === null).length;
  if (unansweredCount > 0) {
    const confirmFinish = confirm(`Tienes ${unansweredCount} pregunta(s) sin responder. ¿Deseas finalizar la prueba de todos modos?`);
    if (!confirmFinish) return;
  }

  // Calculate scores
  let correctCount = 0;
  QUIZ_DATA.forEach((q, idx) => {
    if (userAnswers[idx] === q.correct) {
      correctCount++;
    }
  });

  const total = QUIZ_DATA.length;
  const incorrectCount = total - correctCount;
  const percentage = Math.round((correctCount / total) * 100);

  // Populate results view
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

  // Switch views
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

// Set initial status without toast alert on boot
if (!navigator.onLine) {
  networkStatusEl.classList.add('offline');
  networkTextEl.textContent = 'Sin conexión';
}

// =============================================================================
// 6. PWA Installation Event Handling
// =============================================================================
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar or dialog
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show install button
  btnInstall.classList.add('visible');
});

btnInstall.addEventListener('click', async () => {
  if (!deferredPrompt) return;

  // Show the install prompt
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('🎉 ¡Gracias por instalar QuizMaster PWA!');
  }
  // Clear prompt
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
        console.log('[PWA] Service Worker registrado exitosamente con scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] Error al registrar Service Worker:', error);
      });
  });
}

// =============================================================================
// 8. Event Listeners & Initialization
// =============================================================================
btnPrev.addEventListener('click', handlePrev);
btnNext.addEventListener('click', handleNext);
btnFinish.addEventListener('click', handleFinishQuiz);
btnRestart.addEventListener('click', handleRestartQuiz);

// Initialize First Question
renderCurrentQuestion();
