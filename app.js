/**
 * QuizMaster PWA - Application Logic
 * Integración con Gemini 2.5 Flash API (Carga de PDF y Generación de Exámenes)
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
let selectedPdfFile = null;

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

// Modal Elements (Carga de PDF con Gemini)
const btnOpenUploadModal = document.getElementById('btnOpenUploadModal');
const modalUploadPdf = document.getElementById('modalUploadPdf');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelUpload = document.getElementById('btnCancelUpload');
const dropZonePdf = document.getElementById('dropZonePdf');
const inputPdfFile = document.getElementById('inputPdfFile');
const selectedFileInfo = document.getElementById('selectedFileInfo');
const selectedFileName = document.getElementById('selectedFileName');
const selectedFileSize = document.getElementById('selectedFileSize');
const btnRemoveFile = document.getElementById('btnRemoveFile');
const chkAppendQuestions = document.getElementById('chkAppendQuestions');
const uploadErrorBanner = document.getElementById('uploadErrorBanner');
const uploadErrorText = document.getElementById('uploadErrorText');
const uploadLoadingState = document.getElementById('uploadLoadingState');
const loadingStatusText = document.getElementById('loadingStatusText');
const btnGenerateExam = document.getElementById('btnGenerateExam');

// Results & Toasts
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
const STORAGE_KEY_CUSTOM_EXAM = 'customExamQuestions';

function getBolsaRepasoIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPASO);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error al leer bolsaRepaso:', err);
    return [];
  }
}

function addToBolsaRepaso(questionId) {
  const ids = getBolsaRepasoIds();
  if (!ids.includes(questionId)) {
    ids.push(questionId);
    localStorage.setItem(STORAGE_KEY_REPASO, JSON.stringify(ids));
  }
  updateRecallBadges();
}

function removeFromBolsaRepaso(questionId) {
  let ids = getBolsaRepasoIds();
  if (ids.includes(questionId)) {
    ids = ids.filter(id => id !== questionId);
    localStorage.setItem(STORAGE_KEY_REPASO, JSON.stringify(ids));
  }
  updateRecallBadges();
}

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
// 3. Load Questions (preguntas.json o Custom LocalStorage)
// =============================================================================
async function loadQuestions() {
  try {
    // Si el usuario generó un examen previamente desde un PDF, cargarlo
    const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_EXAM);
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          FULL_QUIZ_DATA = parsed;
          ACTIVE_QUIZ_DATA = [...FULL_QUIZ_DATA];
          userAnswers = new Array(ACTIVE_QUIZ_DATA.length).fill(null);
          updateRecallBadges();
          renderCurrentQuestion();
          showToast(`📚 Examen personalizado cargado (${FULL_QUIZ_DATA.length} preguntas)`);
          return;
        }
      } catch (e) {
        console.warn('Error leyendo examen personalizado:', e);
      }
    }

    // Carga predeterminada del examen base oficial (200 preguntas)
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
    questionTitleEl.textContent = 'Error al cargar las preguntas. Comprueba que el servidor esté activo.';
    showToast('⚠️ No se pudieron cargar las preguntas');
  }
}

// =============================================================================
// 4. UI Rendering Functions
// =============================================================================

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
 * - Verde si es correcta
 * - Rojo la elegida y verde la correcta si es incorrecta
 * - Deshabilita todas las opciones de la pregunta
 * - Despliega automáticamente el fundamento
 * - Guarda en bolsaRepaso si falló, o remueve si acertó en modo repaso
 */
function handleSelectOption(selectedIndex) {
  if (userAnswers[currentQuestionIndex] !== null) return;

  const currentQ = ACTIVE_QUIZ_DATA[currentQuestionIndex];
  userAnswers[currentQuestionIndex] = selectedIndex;

  const isCorrect = (selectedIndex === currentQ.respuestaCorrecta);
  const cards = optionsListEl.querySelectorAll('.option-card');

  cards.forEach((card, idx) => {
    card.disabled = true; // Deshabilitar para evitar cambios posteriores

    if (idx === selectedIndex) {
      card.classList.add('selected');
      if (isCorrect) {
        card.classList.add('correct');
      } else {
        card.classList.add('incorrect');
      }
    } else if (idx === currentQ.respuestaCorrecta) {
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

  // Vibración táctil háptica
  if ('vibrate' in navigator) {
    navigator.vibrate(isCorrect ? 30 : [50, 40, 50]);
  }
}

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
    resultsSubtitleEl.textContent = `Has repasado ${total} preguntas de tu bolsa activa.`;
  } else {
    resultsTitleEl.textContent = "¡Examen Finalizado!";
    resultsSubtitleEl.textContent = "Has completado todas las preguntas evaluadas.";
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

function startActiveRecall() {
  const failedIds = getBolsaRepasoIds();

  if (failedIds.length === 0) {
    showToast('🎉 ¡Felicitaciones! No tienes preguntas en tu Bolsa de Repaso.');
    return;
  }

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
// 5. PDF Upload & Gemini 2.5 Flash Generation Handlers
// =============================================================================

function openUploadModal() {
  modalUploadPdf.style.display = 'flex';
  modalUploadPdf.setAttribute('aria-hidden', 'false');
  resetUploadModal();
}

function closeUploadModal() {
  modalUploadPdf.style.display = 'none';
  modalUploadPdf.setAttribute('aria-hidden', 'true');
  resetUploadModal();
}

function resetUploadModal() {
  selectedPdfFile = null;
  inputPdfFile.value = '';
  selectedFileInfo.style.display = 'none';
  dropZonePdf.style.display = 'flex';
  uploadErrorBanner.style.display = 'none';
  uploadLoadingState.style.display = 'none';
  btnGenerateExam.disabled = true;
  btnCancelUpload.disabled = false;
  btnCloseModal.disabled = false;
}

function handleFileChosen(file) {
  if (!file) return;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    showUploadError('Por favor selecciona únicamente archivos con extensión .pdf');
    return;
  }

  selectedPdfFile = file;
  selectedFileName.textContent = file.name;
  const sizeKb = (file.size / 1024).toFixed(1);
  selectedFileSize.textContent = `(${sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB'})`;

  uploadErrorBanner.style.display = 'none';
  dropZonePdf.style.display = 'none';
  selectedFileInfo.style.display = 'flex';
  btnGenerateExam.disabled = false;
}

function showUploadError(msg) {
  uploadErrorText.textContent = msg;
  uploadErrorBanner.style.display = 'block';
  uploadLoadingState.style.display = 'none';
  btnGenerateExam.disabled = false;
  btnCancelUpload.disabled = false;
  btnCloseModal.disabled = false;
}

// Drag & drop handlers
dropZonePdf.addEventListener('click', () => inputPdfFile.click());
inputPdfFile.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileChosen(e.target.files[0]);
  }
});

dropZonePdf.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZonePdf.classList.add('dragover');
});

dropZonePdf.addEventListener('dragleave', () => {
  dropZonePdf.classList.remove('dragover');
});

dropZonePdf.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZonePdf.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFileChosen(e.dataTransfer.files[0]);
  }
});

btnRemoveFile.addEventListener('click', (e) => {
  e.stopPropagation();
  resetUploadModal();
});

btnOpenUploadModal.addEventListener('click', openUploadModal);
btnCloseModal.addEventListener('click', closeUploadModal);
btnCancelUpload.addEventListener('click', closeUploadModal);

// Close on backdrop click
modalUploadPdf.addEventListener('click', (e) => {
  if (e.target === modalUploadPdf && uploadLoadingState.style.display === 'none') {
    closeUploadModal();
  }
});

/**
 * Enviar PDF al endpoint del servidor y generar preguntas con Gemini 2.5 Flash
 */
async function generateExamFromPdf() {
  if (!selectedPdfFile) return;

  const formData = new FormData();
  formData.append('pdf', selectedPdfFile);

  // UI en estado de carga
  uploadErrorBanner.style.display = 'none';
  uploadLoadingState.style.display = 'flex';
  btnGenerateExam.disabled = true;
  btnCancelUpload.disabled = true;
  btnCloseModal.disabled = true;

  // Secuencia de mensajes informativos en el loader
  loadingStatusText.textContent = "Subiendo documento al servidor...";
  const statusSteps = [
    { time: 2500, text: "Analizando contenido con Gemini 2.5 Flash..." },
    { time: 7000, text: "Estructurando opciones y fundamentos clínicos..." },
    { time: 14000, text: "Validando formato de evaluación interactiva..." }
  ];
  const stepTimeouts = statusSteps.map(step =>
    setTimeout(() => {
      loadingStatusText.textContent = step.text;
    }, step.time)
  );

  try {
    const response = await fetch('/api/generar-examen', {
      method: 'POST',
      body: formData
    });

    stepTimeouts.forEach(clearTimeout);

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Error al procesar el archivo con Gemini.');
    }

    const newQuestions = result.preguntas;
    if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
      throw new Error('Gemini no generó preguntas válidas para este documento.');
    }

    const isAppend = chkAppendQuestions.checked;
    if (isAppend) {
      // Reindexar preguntas añadidas para que los IDs sean únicos
      const currentCount = FULL_QUIZ_DATA.length;
      const reindexed = newQuestions.map((q, idx) => ({
        ...q,
        id: currentCount + idx + 1
      }));
      FULL_QUIZ_DATA = [...FULL_QUIZ_DATA, ...reindexed];
    } else {
      FULL_QUIZ_DATA = newQuestions;
    }

    // Persistir en localStorage
    localStorage.setItem(STORAGE_KEY_CUSTOM_EXAM, JSON.stringify(FULL_QUIZ_DATA));

    // Reiniciar estado con las nuevas preguntas
    isRecallMode = false;
    ACTIVE_QUIZ_DATA = [...FULL_QUIZ_DATA];
    userAnswers = new Array(ACTIVE_QUIZ_DATA.length).fill(null);
    currentQuestionIndex = 0;

    recallModeBanner.style.display = 'none';
    resultsSection.classList.remove('active');
    resultsSection.setAttribute('aria-hidden', 'true');
    quizSection.style.display = 'flex';

    renderCurrentQuestion();
    closeUploadModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    showToast(`🎉 ¡Examen generado con éxito! ${newQuestions.length} preguntas añadidas.`);

  } catch (error) {
    stepTimeouts.forEach(clearTimeout);
    console.error('Error al generar examen:', error);
    showUploadError(error.message || 'Error al comunicarse con el servidor o la API de Gemini.');
  }
}

btnGenerateExam.addEventListener('click', generateExamFromPdf);

// =============================================================================
// 6. Toast Notifications & Network
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

function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (isOnline) {
    networkStatusEl.classList.remove('offline');
    networkTextEl.textContent = 'En línea';
    showToast('🟢 Conexión restablecida');
  } else {
    networkStatusEl.classList.add('offline');
    networkTextEl.textContent = 'Sin conexión';
    showToast('⚠️ Modo offline activado');
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

// Iniciar carga de preguntas
loadQuestions();
