/**
 * QuizMaster PWA - Application Logic
 * Integración Examen Residentado Médico 2026 (200 preguntas)
 * Retroalimentación visual inmediata (Verde/Rojo), Fundamento Automático
 * y Módulo de Bolsa de Repaso Activo (Active Recall) con localStorage
 */

// =============================================================================
// 1. State Management & Variables
// =============================================================================
let FULL_QUIZ_DATA = [];
let ACTIVE_QUIZ_DATA = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let isRecallMode = false;
let isFundamentoVisible = false;
let deferredPrompt = null;

// DOM Elements
const currentQuestionNumEl = document.getElementById('currentQuestionNum');
const totalQuestionsNumEl = document.getElementById('totalQuestionsNum');
const progressBarEl = document.getElementById('progressBar');
const questionCategoryEl = document.getElementById('questionCategory');
const questionTitleEl = document.getElementById('questionTitle');
const optionsListEl = document.getElementById('optionsList');

const recallModeBanner = document.getElementById('recallModeBanner');
const btnExitRecall = document.getElementById('btnExitRecall');
const btnHeaderRecall = document.getElementById('btnHeaderRecall');
const headerRecallCount = document.getElementById('headerRecallCount');

const btnFundamento = document.getElementById('btnFundamento');
const btnFundamentoText = document.getElementById('btnFundamentoText');
const fundamentoCard = document.getElementById('fundamentoCard');
const fundamentoText = document.getElementById('fundamentoText');

const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnFinish = document.getElementById('btnFinish');
const btnRestart = document.getElementById('btnRestart');
const btnReviewFailed = document.getElementById('btnReviewFailed');
const reviewCountBadge = document.getElementById('reviewCountBadge');
const btnInstall = document.getElementById('btnInstall');

const quizSection = document.getElementById('quizSection');
const resultsSection = document.getElementById('resultsSection');
const resultsTitleEl = document.getElementById('resultsTitle');
const resultsSubtitleEl = document.getElementById('resultsSubtitle');
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
// 2. Active Recall (Bolsa de Repaso) LocalStorage Persistence
// =============================================================================
const STORAGE_KEY_REPASO = 'bolsaRepaso';

/**
 * Obtener la lista de IDs de preguntas falladas guardadas en localStorage
 */
function getBolsaRepasoIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPASO);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error al leer bolsaRepaso:', err);
    return [];
  }
}

/**
 * Guardar un ID en la bolsa de repaso (sin duplicados)
 */
function addToBolsaRepaso(questionId) {
  const ids = getBolsaRepasoIds();
  if (!ids.includes(questionId)) {
    ids.push(questionId);
    localStorage.setItem(STORAGE_KEY_REPASO, JSON.stringify(ids));
  }
  updateRecallBadges();
}

/**
 * Remover un ID de la bolsa de repaso (cuando el alumno la responde bien en repaso)
 */
function removeFromBolsaRepaso(questionId) {
  let ids = getBolsaRepasoIds();
  if (ids.includes(questionId)) {
    ids = ids.filter(id => id !== questionId);
    localStorage.setItem(STORAGE_KEY_REPASO, JSON.stringify(ids));
  }
  updateRecallBadges();
}

/**
 * Actualizar contadores visuales de la bolsa de repaso
 */
function updateRecallBadges() {
  const count = getBolsaRepasoIds().length;
  if (headerRecallCount) {
    headerRecallCount.textContent = count;
  }
  if (reviewCountBadge) {
    reviewCountBadge.textContent = count;
  }
  if (btnReviewFailed) {
    btnReviewFailed.disabled = count === 0;
  }
}

// =============================================================================
// 3. Load Questions from preguntas.json
// =============================================================================
async function loadQuestions() {
  try {
    const response = await fetch('./preguntas.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    FULL_QUIZ_DATA = await response.json();
    ACTIVE_QUIZ_DATA = [...FULL_QUIZ_DATA];
    userAnswers = new Array(ACTIVE_QUIZ_DATA.length).fill(null);

    updateRecallBadges();
    renderCurrentQuestion();
  } catch (error) {
    console.error('Error cargando preguntas.json:', error);
    questionTitleEl.textContent = 'Error al cargar las preguntas del examen. Comprueba que el servidor esté activo.';
    showToast('⚠️ No se pudieron cargar las preguntas');
  }
}

// =============================================================================
// 4. UI Rendering Functions
// =============================================================================

/**
 * Renderiza la pregunta actual con sus opciones y estado
 */
function renderCurrentQuestion() {
  if (!ACTIVE_QUIZ_DATA || ACTIVE_QUIZ_DATA.length === 0) return;

  const currentQ = ACTIVE_QUIZ_DATA[currentQuestionIndex];
  const totalQ = ACTIVE_QUIZ_DATA.length;
  const previousAnswer = userAnswers[currentQuestionIndex];

  // 1. Actualizar barra de progreso y contador
  currentQuestionNumEl.textContent = currentQuestionIndex + 1;
  totalQuestionsNumEl.textContent = totalQ;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);
  progressBarEl.style.width = `${progressPercent}%`;
  progressBarEl.setAttribute('aria-valuenow', progressPercent);

  // 2. Encabezado de la pregunta y categoría
  if (isRecallMode) {
    questionCategoryEl.textContent = `🎯 Repaso Activo • Pregunta ${currentQ.id}`;
    questionCategoryEl.style.color = '#f59e0b';
    questionCategoryEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    questionCategoryEl.style.background = 'rgba(245, 158, 11, 0.12)';
  } else {
    questionCategoryEl.textContent = `Pregunta ${currentQ.id} • Residentado Médico 2026`;
    questionCategoryEl.style.color = 'var(--accent-cyan)';
    questionCategoryEl.style.borderColor = 'rgba(6, 182, 212, 0.25)';
    questionCategoryEl.style.background = 'rgba(6, 182, 212, 0.1)';
  }

  questionTitleEl.textContent = currentQ.pregunta;
  fundamentoText.textContent = currentQ.fundamento || 'Justificación oficial no disponible.';

  // 3. Generar opciones de respuesta tipo tarjeta táctil
  optionsListEl.innerHTML = '';
  const optionLetters = ['A', 'B', 'C', 'D'];
  const hasAnswered = previousAnswer !== null;

  currentQ.opciones.forEach((rawOptionText, index) => {
    const cleanText = rawOptionText.replace(/^[A-D]\.\s*/, '');
    const isSelected = previousAnswer === index;
    const isCorrectChoice = index === currentQ.respuestaCorrecta;

    const optionBtn = document.createElement('button');
    optionBtn.type = 'button';
    optionBtn.className = 'option-card';
    optionBtn.setAttribute('role', 'radio');
    optionBtn.setAttribute('data-index', index);

    // Aplicar marcado si ya fue respondida
    if (hasAnswered) {
      optionBtn.disabled = true;
      if (isSelected) {
        optionBtn.classList.add('selected');
        if (isCorrectChoice) {
          optionBtn.classList.add('correct');
        } else {
          optionBtn.classList.add('incorrect');
        }
      } else if (isCorrectChoice) {
        optionBtn.classList.add('correct');
      }
    }

    optionBtn.innerHTML = `
      <div class="option-badge">${optionLetters[index]}</div>
      <span class="option-text">${cleanText}</span>
      <div class="option-radio" aria-hidden="true"></div>
    `;

    optionBtn.addEventListener('click', () => handleSelectOption(index));
    optionsListEl.appendChild(optionBtn);
  });

  // 4. Desplegar fundamento si ya fue respondida, o replegar si es nueva
  if (hasAnswered) {
    showFundamento();
  } else {
    hideFundamento();
  }

  // 5. Controles de Navegación
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
 * Manejo de clic/tap en una opción de respuesta:
 * - Resalta verde si es correcta
 * - Resalta rojo la elegida y verde la correcta si es incorrecta
 * - Deshabilita todas las opciones de la pregunta
 * - Despliega automáticamente el fundamento
 * - Guarda en bolsaRepaso (Active Recall) si falló, o remueve si acertó en modo repaso
 */
function handleSelectOption(selectedIndex) {
  // Evitar cambios si ya fue respondida
  if (userAnswers[currentQuestionIndex] !== null) return;

  const currentQ = ACTIVE_QUIZ_DATA[currentQuestionIndex];
  userAnswers[currentQuestionIndex] = selectedIndex;

  const isCorrect = (selectedIndex === currentQ.respuestaCorrecta);
  const cards = optionsListEl.querySelectorAll('.option-card');

  // Aplicar clases de validación inmediata
  cards.forEach((card, idx) => {
    card.disabled = true; // Deshabilitar para evitar cambios

    if (idx === selectedIndex) {
      card.classList.add('selected');
      if (isCorrect) {
        card.classList.add('correct');
      } else {
        card.classList.add('incorrect');
      }
    } else if (idx === currentQ.respuestaCorrecta) {
      // Mostrar en verde la opción que era la correcta
      card.classList.add('correct');
    }
  });

  // Gestión de la Bolsa de Repaso Activo
  if (!isCorrect) {
    addToBolsaRepaso(currentQ.id);
    showToast('❌ Incorrecta. Guardada en Bolsa de Repaso Activo.');
  } else {
    if (isRecallMode) {
      removeFromBolsaRepaso(currentQ.id);
      showToast('✅ ¡Excelente! Eliminada de la Bolsa de Repaso.');
    }
  }

  // Desplegar automáticamente el contenedor de fundamento
  showFundamento();

  // Vibración táctil si el dispositivo la soporta
  if ('vibrate' in navigator) {
    navigator.vibrate(isCorrect ? 30 : [50, 40, 50]);
  }
}

/**
 * Control del contenedor de Fundamento
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
 * Navegación entre preguntas
 */
function handleNext() {
  if (currentQuestionIndex < ACTIVE_QUIZ_DATA.length - 1) {
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
 * Finalizar Examen y Desplegar Resultados
 */
function handleFinishQuiz() {
  const unansweredCount = userAnswers.filter(ans => ans === null).length;
  if (unansweredCount > 0) {
    const confirmFinish = confirm(`Tienes ${unansweredCount} pregunta(s) sin responder de ${ACTIVE_QUIZ_DATA.length}. ¿Deseas finalizar la prueba de todos modos?`);
    if (!confirmFinish) return;
  }

  let correctCount = 0;
  ACTIVE_QUIZ_DATA.forEach((q, idx) => {
    if (userAnswers[idx] === q.respuestaCorrecta) {
      correctCount++;
    }
  });

  const total = ACTIVE_QUIZ_DATA.length;
  const incorrectCount = total - correctCount;
  const percentage = Math.round((correctCount / total) * 100);

  scorePercentEl.textContent = `${percentage}%`;
  scoreFractionEl.textContent = `${correctCount} de ${total} preguntas correctas`;
  statCorrectEl.textContent = correctCount;
  statIncorrectEl.textContent = incorrectCount;
  statAccuracyEl.textContent = `${percentage}%`;

  if (isRecallMode) {
    resultsTitleEl.textContent = "¡Sesión de Repaso Finalizada!";
    resultsSubtitleEl.textContent = `Has repasado ${total} preguntas que tenías pendientes.`;
  } else {
    resultsTitleEl.textContent = "¡Examen Finalizado!";
    resultsSubtitleEl.textContent = "Has completado la evaluación del Residentado Médico 2026.";
  }

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

  updateRecallBadges();

  quizSection.style.display = 'none';
  resultsSection.classList.add('active');
  resultsSection.setAttribute('aria-hidden', 'false');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Iniciar sesión de Active Recall con las preguntas falladas
 */
function startActiveRecall() {
  const failedIds = getBolsaRepasoIds();

  if (failedIds.length === 0) {
    showToast('🎉 ¡Felicitaciones! No tienes preguntas en tu Bolsa de Repaso.');
    return;
  }

  // Filtrar banco completo según los IDs guardados
  const failedQuestions = FULL_QUIZ_DATA.filter(q => failedIds.includes(q.id));

  if (failedQuestions.length === 0) {
    showToast('No se encontraron las preguntas seleccionadas.');
    return;
  }

  isRecallMode = true;
  ACTIVE_QUIZ_DATA = failedQuestions;
  userAnswers = new Array(ACTIVE_QUIZ_DATA.length).fill(null);
  currentQuestionIndex = 0;

  recallModeBanner.style.display = 'flex';
  resultsSection.classList.remove('active');
  resultsSection.setAttribute('aria-hidden', 'true');
  quizSection.style.display = 'flex';

  renderCurrentQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`🎯 Modo Repaso Activo: ${failedQuestions.length} pregunta(s)`);
}

/**
 * Salir del modo de Repaso Activo y regresar al examen completo
 */
function exitActiveRecall() {
  isRecallMode = false;
  ACTIVE_QUIZ_DATA = [...FULL_QUIZ_DATA];
  userAnswers = new Array(ACTIVE_QUIZ_DATA.length).fill(null);
  currentQuestionIndex = 0;

  recallModeBanner.style.display = 'none';
  resultsSection.classList.remove('active');
  resultsSection.setAttribute('aria-hidden', 'true');
  quizSection.style.display = 'flex';

  renderCurrentQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('📋 Volviste al Examen Completo');
}

/**
 * Reiniciar examen completo desde cero
 */
function handleRestartQuiz() {
  isRecallMode = false;
  ACTIVE_QUIZ_DATA = [...FULL_QUIZ_DATA];
  userAnswers = new Array(ACTIVE_QUIZ_DATA.length).fill(null);
  currentQuestionIndex = 0;

  recallModeBanner.style.display = 'none';
  resultsSection.classList.remove('active');
  resultsSection.setAttribute('aria-hidden', 'true');
  quizSection.style.display = 'flex';

  renderCurrentQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================================================
// 5. Toast Notifications
// =============================================================================
let toastTimeout;
function showToast(message, duration = 3000) {
  clearTimeout(toastTimeout);
  toastTextEl.textContent = message;
  toastMessageEl.classList.add('show');

  toastTimeout = setTimeout(() => {
    toastMessageEl.classList.remove('show');
  }, duration);
}

// =============================================================================
// 6. Network Connectivity Listeners
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
// 7. PWA Installation Event Handling
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
  showToast('📱 QuizMaster instalada en tu dispositivo');
  btnInstall.classList.remove('visible');
});

// =============================================================================
// 8. Service Worker Registration
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
// 9. Event Listeners & Boot
// =============================================================================
btnFundamento.addEventListener('click', toggleFundamento);
btnPrev.addEventListener('click', handlePrev);
btnNext.addEventListener('click', handleNext);
btnFinish.addEventListener('click', handleFinishQuiz);
btnRestart.addEventListener('click', handleRestartQuiz);
btnReviewFailed.addEventListener('click', startActiveRecall);
btnExitRecall.addEventListener('click', exitActiveRecall);
if (btnHeaderRecall) {
  btnHeaderRecall.addEventListener('click', () => {
    const failedIds = getBolsaRepasoIds();
    if (failedIds.length === 0) {
      showToast('🎉 ¡Bolsa vacía! No tienes preguntas falladas pendientes.');
    } else {
      startActiveRecall();
    }
  });
}

// Iniciar carga de datos
loadQuestions();
