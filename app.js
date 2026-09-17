/**
 * QuizMaster PWA - Multi-Examen Platform
 * Dashboard Principal (#view-home), Aleatorización Inteligente con Persistencia,
 * Bolsas de Active Recall Independientes, Detección Offline para Gemini 2.5 Flash
 */

// =============================================================================
// 1. Constantes y Claves de LocalStorage
// =============================================================================
const STORAGE_KEY_CUSTOM_EXAMS = 'pwa_custom_exams';
const STORAGE_KEY_RANDOM_MODE = 'pwa_random_mode';
const OFFICIAL_EXAM_ID = 'residentado_2026';

// Las 8 Especialidades Base de Medicina Interna
const SPECIALTIES_LIST = [
  'Gastroenterología',
  'Cardiología',
  'Neumología',
  'Nefrología',
  'Hematología',
  'Endocrinología',
  'Reumatología',
  'Infectología'
];

// Estado Global
let ALL_EXAMS = [];              // Lista de todos los exámenes (oficial + personalizados + mix)
let currentExam = null;          // Examen actualmente seleccionado
let currentQuestions = [];       // Preguntas del examen en curso (original o barajadas)
let currentQuestionIndex = 0;
let isRecallMode = false;
let isFundamentoVisible = false;
let deferredPrompt = null;
let selectedPdfFile = null;

// Estado para Auditoría y Modo Mix
let pendingAuditExam = null;
let selectedMixQty = 10;
let selectedMixSpecialties = new Set(SPECIALTIES_LIST);

// =============================================================================
// 2. Elementos del DOM
// =============================================================================
// Vistas Principales
const viewHome = document.getElementById('view-home');
const quizSection = document.getElementById('quizSection');
const resultsSection = document.getElementById('resultsSection');

// Cabecera y Navegación
const btnBackHome = document.getElementById('btnBackHome');
const btnInstall = document.getElementById('btnInstall');
const btnOpenUploadModal = document.getElementById('btnOpenUploadModal');
const uploadBtnWrap = document.getElementById('uploadBtnWrap');
const offlineTooltip = document.getElementById('offlineTooltip');
const networkStatusEl = document.getElementById('networkStatus');
const networkTextEl = document.getElementById('networkText');

// Dashboard Elements & Modo Mix Banner
const toggleRandomMode = document.getElementById('toggleRandomMode');
const examsTotalCount = document.getElementById('examsTotalCount');
const examsGrid = document.getElementById('examsGrid');
const btnOpenModoMix = document.getElementById('btnOpenModoMix');

// Quiz View Elements
const recallModeBanner = document.getElementById('recallModeBanner');
const btnExitRecall = document.getElementById('btnExitRecall');
const currentQuestionNumEl = document.getElementById('currentQuestionNum');
const totalQuestionsNumEl = document.getElementById('totalQuestionsNum');
const progressBarEl = document.getElementById('progressBar');
const questionCategoryEl = document.getElementById('questionCategory');
const questionTitleEl = document.getElementById('questionTitle');
const optionsListEl = document.getElementById('optionsList');

// Metadata Badges (Especialidad, Año, Dificultad)
const badgeSpecialty = document.getElementById('badgeSpecialty');
const badgeYear = document.getElementById('badgeYear');
const badgeDifficulty = document.getElementById('badgeDifficulty');

// Fundamento Elements (Desglosado: Correcta vs Descarte)
const btnFundamento = document.getElementById('btnFundamento');
const btnFundamentoText = document.getElementById('btnFundamentoText');
const fundamentoCard = document.getElementById('fundamentoCard');
const fundamentoCorrectaText = document.getElementById('fundamentoCorrectaText');
const fundamentoDescarteText = document.getElementById('fundamentoDescarteText');
const fundamentoLegacyText = document.getElementById('fundamentoLegacyText');

const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnFinish = document.getElementById('btnFinish');

// Results Elements
const resultsTitleEl = document.getElementById('resultsTitle');
const resultsSubtitleEl = document.getElementById('resultsSubtitle');
const scorePercentEl = document.getElementById('scorePercent');
const scoreFractionEl = document.getElementById('scoreFraction');
const statCorrectEl = document.getElementById('statCorrect');
const statIncorrectEl = document.getElementById('statIncorrect');
const statAccuracyEl = document.getElementById('statAccuracy');
const statStatusEl = document.getElementById('statStatus');
const btnReviewFailed = document.getElementById('btnReviewFailed');
const reviewCountBadge = document.getElementById('reviewCountBadge');
const btnRestart = document.getElementById('btnRestart');
const btnResultsBackHome = document.getElementById('btnResultsBackHome');

// Modal Elements (Carga PDF con Gemini)
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

// Modal Elements (Auditoría y Clasificación de PDF)
const modalAuditPdf = document.getElementById('modalAuditPdf');
const btnCloseAuditModal = document.getElementById('btnCloseAuditModal');
const btnCancelAudit = document.getElementById('btnCancelAudit');
const btnConfirmSaveExam = document.getElementById('btnConfirmSaveExam');
const inputAuditExamTitle = document.getElementById('inputAuditExamTitle');
const auditTotalQuestionsCount = document.getElementById('auditTotalQuestionsCount');
const auditQuestionsContainer = document.getElementById('auditQuestionsContainer');

// Modal Elements (Modo Mix / Simulacros Personalizados)
const modalModoMix = document.getElementById('modalModoMix');
const btnCloseMixModal = document.getElementById('btnCloseMixModal');
const btnCancelMix = document.getElementById('btnCancelMix');
const btnStartMixExam = document.getElementById('btnStartMixExam');
const btnToggleAllSpecialties = document.getElementById('btnToggleAllSpecialties');
const mixSpecialtiesGrid = document.getElementById('mixSpecialtiesGrid');
const mixAvailableCount = document.getElementById('mixAvailableCount');

// Toasts
const toastContainerEl = document.getElementById('toastContainer');
const toastMessageEl = document.getElementById('toastMessage');
const toastTextEl = document.getElementById('toastText');

// =============================================================================
// 3. Gestión de Persistencia: Exámenes, Estado y Active Recall
// =============================================================================

function getCustomExams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_EXAMS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error leyendo exámenes personalizados:', e);
    return [];
  }
}

function saveCustomExams(exams) {
  localStorage.setItem(STORAGE_KEY_CUSTOM_EXAMS, JSON.stringify(exams));
}

// Active Recall Independiente por Examen
function getBolsaRepasoKey(examId) {
  return `bolsaRepaso_${examId}`;
}

function getBolsaRepasoIds(examId) {
  try {
    const raw = localStorage.getItem(getBolsaRepasoKey(examId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addToBolsaRepaso(examId, questionId) {
  const ids = getBolsaRepasoIds(examId);
  if (!ids.includes(questionId)) {
    ids.push(questionId);
    localStorage.setItem(getBolsaRepasoKey(examId), JSON.stringify(ids));
  }
}

function removeFromBolsaRepaso(examId, questionId) {
  let ids = getBolsaRepasoIds(examId);
  if (ids.includes(questionId)) {
    ids = ids.filter(id => id !== questionId);
    localStorage.setItem(getBolsaRepasoKey(examId), JSON.stringify(ids));
  }
}

// Estado del Examen (Respuestas marcadas, índice actual y orden barajado)
function getExamStateKey(examId) {
  return `exam_state_${examId}`;
}

function getExamState(examId) {
  try {
    const raw = localStorage.getItem(getExamStateKey(examId));
    return raw ? JSON.parse(raw) : { currentIndex: 0, answers: {}, isRandom: false, shuffledQuestions: null };
  } catch (e) {
    return { currentIndex: 0, answers: {}, isRandom: false, shuffledQuestions: null };
  }
}

function saveExamState(examId, state) {
  localStorage.setItem(getExamStateKey(examId), JSON.stringify(state));
}

function clearExamState(examId) {
  localStorage.removeItem(getExamStateKey(examId));
}

// Modo Aleatorio Global
function isRandomModeActive() {
  return localStorage.getItem(STORAGE_KEY_RANDOM_MODE) === 'true';
}

function setRandomModeActive(active) {
  localStorage.setItem(STORAGE_KEY_RANDOM_MODE, active ? 'true' : 'false');
}

// =============================================================================
// 4. Lógica de Aleatorización Inteligente (Fisher-Yates)
// =============================================================================

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Baraja las preguntas y TAMBIÉN las alternativas (A, B, C, D)
 * de cada pregunta, actualizando respuestaCorrecta a su nueva posición.
 */
function randomizeExam(questions) {
  const letters = ['A', 'B', 'C', 'D'];
  const randomizedQuestions = shuffleArray(questions).map(q => {
    // Empaquetar opciones con su condición de si era la correcta
    const optionsWithFlag = q.opciones.map((opt, idx) => ({
      text: opt.replace(/^[A-D]\.\s*/, ''),
      isCorrect: idx === q.respuestaCorrecta
    }));

    // Barajar las 4 opciones
    const shuffledOptions = shuffleArray(optionsWithFlag);

    // Encontrar el nuevo índice correcto
    const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);

    // Reconstruir con prefijos A., B., C., D.
    const newOpciones = shuffledOptions.map((o, idx) => `${letters[idx]}. ${o.text}`);

    return {
      ...q,
      opciones: newOpciones,
      respuestaCorrecta: newCorrectIndex
    };
  });

  return randomizedQuestions;
}

// =============================================================================
// 5. Carga y Renderizado del Dashboard (#view-home)
// =============================================================================

async function initPlatform() {
  // Configurar toggle de modo aleatorio
  if (toggleRandomMode) {
    toggleRandomMode.checked = isRandomModeActive();
    toggleRandomMode.addEventListener('change', (e) => {
      setRandomModeActive(e.target.checked);
      showToast(e.target.checked ? '🎲 Modo Aleatorio Activado' : '📋 Modo Secuencial Activado');
    });
  }

  // Cargar examen oficial desde preguntas.json
  try {
    const response = await fetch('./preguntas.json');
    const officialQuestions = await response.json();

    const officialExam = {
      id: OFFICIAL_EXAM_ID,
      title: 'Residentado Médico 2026',
      isOfficial: true,
      date: 'Examen Oficial Comentado',
      questions: officialQuestions
    };

    const customExams = getCustomExams();
    ALL_EXAMS = [officialExam, ...customExams];

    renderDashboard();
    updateNetworkStatus();
  } catch (err) {
    console.error('Error inicializando exámenes:', err);
    showToast('⚠️ Error al cargar el examen oficial.');
  }
}

/**
 * Renderiza todas las tarjetas de exámenes en el Dashboard
 */
function renderDashboard() {
  if (!examsGrid) return;
  examsGrid.innerHTML = '';

  examsTotalCount.textContent = ALL_EXAMS.length;

  ALL_EXAMS.forEach(exam => {
    const totalQuestions = exam.questions.length;
    const state = getExamState(exam.id);
    const answers = state.answers || {};
    const answeredCount = Object.keys(answers).length;

    // Calcular estadísticas globales
    let correctCount = 0;
    exam.questions.forEach(q => {
      if (answers[q.id] !== undefined && answers[q.id] === q.respuestaCorrecta) {
        correctCount++;
      }
    });

    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progressPercent = Math.round((answeredCount / totalQuestions) * 100);
    const recallCount = getBolsaRepasoIds(exam.id).length;

    const card = document.createElement('div');
    card.className = 'exam-card';
    card.setAttribute('data-exam-id', exam.id);

    card.innerHTML = `
      <div class="exam-card-top">
        <span class="exam-badge-type ${exam.isOfficial ? 'official' : 'custom'}">
          ${exam.isOfficial ? 'Oficial CONAREME' : 'Generado con Gemini'}
        </span>
        ${!exam.isOfficial ? `
          <button class="btn-delete-exam" data-delete-id="${exam.id}" title="Eliminar examen y sus datos" aria-label="Eliminar examen">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        ` : ''}
      </div>

      <h3 class="exam-card-title">${exam.title}</h3>

      <div class="exam-card-meta">
        <span>📝 ${totalQuestions} preguntas</span>
        <span>•</span>
        <span>${exam.date}</span>
      </div>

      <div class="exam-progress-wrap">
        <div class="exam-progress-labels">
          <span class="exam-progress-stats">${answeredCount}/${totalQuestions} respondidas</span>
          <span class="exam-accuracy-stats">${accuracy}% aciertos</span>
        </div>
        <div class="exam-progress-track">
          <div class="exam-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="exam-card-actions">
        <button class="btn-card-primary" data-start-id="${exam.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          ${answeredCount > 0 && answeredCount < totalQuestions ? 'Continuar' : 'Iniciar'}
        </button>

        <button class="btn-card-recall" data-recall-id="${exam.id}" ${recallCount === 0 ? 'disabled' : ''}>
          <span>Repasar Falladas</span>
          <span class="badge-recall-count">${recallCount}</span>
        </button>
      </div>
    `;

    // Eventos de botones
    card.querySelector(`[data-start-id="${exam.id}"]`).addEventListener('click', () => {
      startExam(exam.id, false);
    });

    card.querySelector(`[data-recall-id="${exam.id}"]`).addEventListener('click', () => {
      startExam(exam.id, true);
    });

    const deleteBtn = card.querySelector(`[data-delete-id="${exam.id}"]`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteExam(exam.id);
      });
    }

    examsGrid.appendChild(card);
  });
}

/**
 * Eliminar un examen personalizado
 */
function deleteExam(examId) {
  const exam = ALL_EXAMS.find(e => e.id === examId);
  if (!exam) return;

  const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar el examen "${exam.title}" y todos sus progresos?`);
  if (!confirmDelete) return;

  // Filtrar de la lista
  const customExams = getCustomExams().filter(e => e.id !== examId);
  saveCustomExams(customExams);

  // Limpiar estado y bolsa de repaso
  clearExamState(examId);
  localStorage.removeItem(getBolsaRepasoKey(examId));

  // Actualizar lista global
  ALL_EXAMS = ALL_EXAMS.filter(e => e.id !== examId);
  renderDashboard();
  showToast('🗑️ Examen eliminado con éxito');
}

// =============================================================================
// 6. Navegación y Flujo del Examen
// =============================================================================

function showView(viewName) {
  if (viewName === 'home') {
    viewHome.style.display = 'flex';
    quizSection.style.display = 'none';
    resultsSection.classList.remove('active');
    resultsSection.setAttribute('aria-hidden', 'true');
    btnBackHome.style.display = 'none';
    renderDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'quiz') {
    viewHome.style.display = 'none';
    quizSection.style.display = 'flex';
    resultsSection.classList.remove('active');
    resultsSection.setAttribute('aria-hidden', 'true');
    btnBackHome.style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'results') {
    viewHome.style.display = 'none';
    quizSection.style.display = 'none';
    resultsSection.classList.add('active');
    resultsSection.setAttribute('aria-hidden', 'false');
    btnBackHome.style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

btnBackHome.addEventListener('click', () => {
  showView('home');
});

btnResultsBackHome.addEventListener('click', () => {
  showView('home');
});

/**
 * Inicia una sesión de examen (normal o Active Recall)
 */
function startExam(examId, recallOnly = false) {
  currentExam = ALL_EXAMS.find(e => e.id === examId);
  if (!currentExam) return;

  isRecallMode = recallOnly;

  if (isRecallMode) {
    const failedIds = getBolsaRepasoIds(examId);
    if (failedIds.length === 0) {
      showToast('🎉 ¡Excelente! No tienes preguntas falladas en este examen.');
      return;
    }
    currentQuestions = currentExam.questions.filter(q => failedIds.includes(q.id));
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);
    recallModeBanner.style.display = 'flex';
    showToast(`🎯 Modo Repaso Activo: ${currentQuestions.length} preguntas`);
  } else {
    recallModeBanner.style.display = 'none';
    const useRandom = isRandomModeActive();
    const state = getExamState(examId);

    // Si hay un estado previo guardado con el mismo modo aleatorio, restaurar
    if (state && state.shuffledQuestions && state.isRandom === useRandom) {
      currentQuestions = state.shuffledQuestions;
      currentQuestionIndex = state.currentIndex || 0;
    } else {
      // Crear nueva secuencia (aleatoria o secuencial)
      if (useRandom) {
        currentQuestions = randomizeExam(currentExam.questions);
      } else {
        currentQuestions = [...currentExam.questions];
      }
      currentQuestionIndex = 0;

      // Guardar nueva semilla en localStorage
      saveExamState(examId, {
        currentIndex: 0,
        answers: {},
        isRandom: useRandom,
        shuffledQuestions: currentQuestions
      });
    }

    // Reconstruir userAnswers a partir de los IDs guardados en state.answers
    const currentSavedState = getExamState(examId);
    const answersMap = currentSavedState.answers || {};
    userAnswers = currentQuestions.map(q => (answersMap[q.id] !== undefined ? answersMap[q.id] : null));
  }

  showView('quiz');
  renderCurrentQuestion();
}

/**
 * Renderiza la pregunta actual en pantalla
 */
function renderCurrentQuestion() {
  if (!currentQuestions || currentQuestions.length === 0) return;

  const currentQ = currentQuestions[currentQuestionIndex];
  const totalQ = currentQuestions.length;
  const previousAnswer = userAnswers[currentQuestionIndex];

  // 1. Barra de progreso y contador
  currentQuestionNumEl.textContent = currentQuestionIndex + 1;
  totalQuestionsNumEl.textContent = totalQ;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);
  progressBarEl.style.width = `${progressPercent}%`;
  progressBarEl.setAttribute('aria-valuenow', progressPercent);

  // 2. Encabezado
  if (isRecallMode) {
    questionCategoryEl.textContent = `🎯 Repaso Activo • ${currentExam.title}`;
    questionCategoryEl.style.color = '#f59e0b';
    questionCategoryEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    questionCategoryEl.style.background = 'rgba(245, 158, 11, 0.12)';
  } else {
    questionCategoryEl.textContent = `Pregunta ${currentQ.id} • ${currentExam.title}`;
    questionCategoryEl.style.color = 'var(--accent-cyan)';
    questionCategoryEl.style.borderColor = 'rgba(6, 182, 212, 0.25)';
    questionCategoryEl.style.background = 'rgba(6, 182, 212, 0.1)';
  }

  questionTitleEl.textContent = currentQ.pregunta;

  // 2.1 Metadata Badges (Especialidad, Año, Dificultad)
  const spec = currentQ.especialidad || 'Infectología';
  const year = currentQ.anio || '2026';
  const diff = currentQ.dificultad || 'Intermedio';

  if (badgeSpecialty) badgeSpecialty.textContent = spec;
  if (badgeYear) badgeYear.textContent = year;
  if (badgeDifficulty) {
    badgeDifficulty.textContent = diff;
    badgeDifficulty.className = 'meta-badge badge-difficulty';
    if (diff === 'Fácil') {
      badgeDifficulty.classList.add('difficulty-easy');
    } else if (diff === 'Difícil') {
      badgeDifficulty.classList.add('difficulty-hard');
    } else {
      badgeDifficulty.classList.add('difficulty-medium');
    }
  }

  // 2.2 Fundamentación Desglosada (Correcta vs Descarte)
  if (currentQ.fundamentoDetallado && (currentQ.fundamentoDetallado.correcta || currentQ.fundamentoDetallado.descarte)) {
    if (fundamentoCorrectaText) {
      fundamentoCorrectaText.textContent = currentQ.fundamentoDetallado.correcta || 'Opción respaldada por guías clínicas.';
      const block = fundamentoCorrectaText.closest('.fundamento-block');
      if (block) block.style.display = 'block';
    }
    if (fundamentoDescarteText) {
      fundamentoDescarteText.textContent = currentQ.fundamentoDetallado.descarte || 'Las demás alternativas se descartan por no ser la conducta de elección.';
      const block = fundamentoDescarteText.closest('.fundamento-block');
      if (block) block.style.display = 'block';
    }
    if (fundamentoLegacyText) fundamentoLegacyText.style.display = 'none';
  } else {
    if (fundamentoCorrectaText) {
      const block = fundamentoCorrectaText.closest('.fundamento-block');
      if (block) block.style.display = 'none';
    }
    if (fundamentoDescarteText) {
      const block = fundamentoDescarteText.closest('.fundamento-block');
      if (block) block.style.display = 'none';
    }
    if (fundamentoLegacyText) {
      fundamentoLegacyText.style.display = 'block';
      fundamentoLegacyText.textContent = currentQ.fundamento || 'Justificación oficial no disponible.';
    }
  }

  // 3. Opciones de respuesta
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

  // 4. Fundamento automático
  if (hasAnswered) {
    showFundamento();
  } else {
    hideFundamento();
  }

  // 5. Botones Anterior / Siguiente / Finalizar
  btnPrev.disabled = currentQuestionIndex === 0;

  const isLast = currentQuestionIndex === totalQ - 1;
  if (isLast) {
    btnNext.style.display = 'none';
    btnFinish.classList.add('visible');
  } else {
    btnNext.style.display = 'inline-flex';
    btnFinish.classList.remove('visible');
  }
}

/**
 * Manejo de selección de respuesta
 */
function handleSelectOption(selectedIndex) {
  if (userAnswers[currentQuestionIndex] !== null) return;

  const currentQ = currentQuestions[currentQuestionIndex];
  userAnswers[currentQuestionIndex] = selectedIndex;

  // Persistir en el estado del examen por el ID único de la pregunta
  if (!isRecallMode) {
    const state = getExamState(currentExam.id);
    state.answers = state.answers || {};
    state.answers[currentQ.id] = selectedIndex;
    state.currentIndex = currentQuestionIndex;
    saveExamState(currentExam.id, state);
  }

  const isCorrect = (selectedIndex === currentQ.respuestaCorrecta);
  const cards = optionsListEl.querySelectorAll('.option-card');

  cards.forEach((card, idx) => {
    card.disabled = true;

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

  // Gestión de Active Recall aislada para este examen
  if (!isCorrect) {
    addToBolsaRepaso(currentExam.id, currentQ.id);
    showToast('❌ Incorrecta. Guardada en Bolsa de Repaso de este examen.');
  } else {
    if (isRecallMode) {
      removeFromBolsaRepaso(currentExam.id, currentQ.id);
      showToast('✅ ¡Bien hecho! Eliminada de tu Bolsa de Repaso.');
    }
  }

  showFundamento();

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
  if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    if (!isRecallMode) {
      const state = getExamState(currentExam.id);
      state.currentIndex = currentQuestionIndex;
      saveExamState(currentExam.id, state);
    }
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handlePrev() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    if (!isRecallMode) {
      const state = getExamState(currentExam.id);
      state.currentIndex = currentQuestionIndex;
      saveExamState(currentExam.id, state);
    }
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handleFinishQuiz() {
  const unansweredCount = userAnswers.filter(ans => ans === null).length;
  if (unansweredCount > 0) {
    const confirmFinish = confirm(`Tienes ${unansweredCount} pregunta(s) sin responder de ${currentQuestions.length}. ¿Deseas finalizar la prueba de todos modos?`);
    if (!confirmFinish) return;
  }

  let correctCount = 0;
  currentQuestions.forEach((q, idx) => {
    if (userAnswers[idx] === q.respuestaCorrecta) {
      correctCount++;
    }
  });

  const total = currentQuestions.length;
  const incorrectCount = total - correctCount;
  const percentage = Math.round((correctCount / total) * 100);

  scorePercentEl.textContent = `${percentage}%`;
  scoreFractionEl.textContent = `${correctCount} de ${total} preguntas correctas`;
  statCorrectEl.textContent = correctCount;
  statIncorrectEl.textContent = incorrectCount;
  statAccuracyEl.textContent = `${percentage}%`;

  if (isRecallMode) {
    resultsTitleEl.textContent = "¡Sesión de Repaso Finalizada!";
    resultsSubtitleEl.textContent = `Has repasado ${total} preguntas falladas de ${currentExam.title}.`;
  } else {
    resultsTitleEl.textContent = "¡Examen Finalizado!";
    resultsSubtitleEl.textContent = `Evaluación completada para: ${currentExam.title}.`;
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

  // Actualizar botón de falladas en resultados
  const failedCount = getBolsaRepasoIds(currentExam.id).length;
  reviewCountBadge.textContent = failedCount;
  btnReviewFailed.disabled = failedCount === 0;

  showView('results');
}

btnExitRecall.addEventListener('click', () => {
  startExam(currentExam.id, false);
});

btnRestart.addEventListener('click', () => {
  clearExamState(currentExam.id);
  startExam(currentExam.id, false);
});

btnReviewFailed.addEventListener('click', () => {
  startExam(currentExam.id, true);
});

btnPrev.addEventListener('click', handlePrev);
btnNext.addEventListener('click', handleNext);
btnFinish.addEventListener('click', handleFinishQuiz);
btnFundamento.addEventListener('click', toggleFundamento);

// =============================================================================
// 7. Detección Offline y Control de Red para Gemini
// =============================================================================

function updateNetworkStatus() {
  const isOnline = navigator.onLine;

  if (isOnline) {
    networkStatusEl.classList.remove('offline');
    networkTextEl.textContent = 'En línea';
    btnOpenUploadModal.disabled = false;
    offlineTooltip.style.display = 'none';
    uploadBtnWrap.removeAttribute('title');
  } else {
    networkStatusEl.classList.add('offline');
    networkTextEl.textContent = 'Sin conexión';
    btnOpenUploadModal.disabled = true;
    offlineTooltip.style.display = 'block';
    uploadBtnWrap.setAttribute('title', 'Requiere conexión a internet para procesar PDFs con IA');
    showToast('⚠️ Modo offline: Generación de exámenes con IA deshabilitada');
  }
}

window.addEventListener('online', () => {
  updateNetworkStatus();
  showToast('🟢 Conexión a internet restablecida');
});

window.addEventListener('offline', () => {
  updateNetworkStatus();
});

// =============================================================================
// 8. Modal de Subida de PDF y Llamada a Gemini 2.5 Flash
// =============================================================================

function openUploadModal() {
  if (!navigator.onLine) {
    showToast('⚠️ Requiere conexión a internet para procesar PDFs con IA');
    return;
  }
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

// Drag & drop
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

modalUploadPdf.addEventListener('click', (e) => {
  if (e.target === modalUploadPdf && uploadLoadingState.style.display === 'none') {
    closeUploadModal();
  }
});

/**
 * Enviar PDF al servidor y registrar nuevo examen personalizado
 */
async function generateExamFromPdf() {
  if (!selectedPdfFile) return;

  if (!navigator.onLine) {
    showUploadError('No hay conexión a internet. Se requiere red para conectar con la API de Gemini.');
    return;
  }

  const formData = new FormData();
  formData.append('pdf', selectedPdfFile);

  uploadErrorBanner.style.display = 'none';
  uploadLoadingState.style.display = 'flex';
  btnGenerateExam.disabled = true;
  btnCancelUpload.disabled = true;
  btnCloseModal.disabled = true;

  loadingStatusText.textContent = "Subiendo documento al servidor...";
  const statusSteps = [
    { time: 2500, text: "Analizando contenido con Gemini 2.5 Flash..." },
    { time: 7000, text: "Estructurando opciones y fundamentos clínicos..." },
    { time: 14000, text: "Validando formato multi-examen..." }
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

    // Preparar datos y abrir panel de auditoría previa (NO guardar directamente)
    const examName = selectedPdfFile.name.replace(/\.pdf$/i, '');
    const cleanTitle = examName.length > 40 ? examName.substring(0, 38) + '...' : examName;

    closeUploadModal();
    openAuditModal({
      title: cleanTitle,
      filename: selectedPdfFile.name,
      questions: newQuestions
    });

  } catch (error) {
    stepTimeouts.forEach(clearTimeout);
    console.error('Error al generar examen:', error);
    showUploadError(error.message || 'Error al comunicarse con la API de Gemini.');
  }
}

btnGenerateExam.addEventListener('click', generateExamFromPdf);

// =============================================================================
// 9. Módulo de Auditoría y Revisión de PDF (#modalAuditPdf)
// =============================================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openAuditModal(examData) {
  pendingAuditExam = examData;
  if (!modalAuditPdf) return;

  if (inputAuditExamTitle) {
    inputAuditExamTitle.value = examData.title || 'Examen Clínico';
  }
  if (auditTotalQuestionsCount) {
    auditTotalQuestionsCount.textContent = examData.questions.length;
  }

  if (auditQuestionsContainer) {
    auditQuestionsContainer.innerHTML = '';

    const optionLetters = ['A', 'B', 'C', 'D'];

    examData.questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'audit-question-card';
      card.setAttribute('data-idx', idx);

      const correctLetter = optionLetters[q.respuestaCorrecta] || 'A';
      const cleanSnippet = q.pregunta ? q.pregunta.slice(0, 160) : '';

      card.innerHTML = `
        <div class="audit-q-header">
          <div class="audit-q-snippet">
            <strong>#${idx + 1}:</strong> ${escapeHtml(cleanSnippet)}${q.pregunta && q.pregunta.length > 160 ? '...' : ''}
          </div>
          <div class="audit-key-badge" title="Clave auditada por Gemini">
            Clave: ${correctLetter}
          </div>
        </div>

        <div class="audit-q-controls">
          <div class="audit-control-group">
            <label>Especialidad:</label>
            <select class="audit-select audit-select-specialty" data-idx="${idx}">
              ${SPECIALTIES_LIST.map(s => `
                <option value="${s}" ${q.especialidad === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </div>

          <div class="audit-control-group">
            <label>Año:</label>
            <input type="text" class="audit-input audit-input-year" data-idx="${idx}" value="${escapeHtml(q.anio || '2024')}" maxlength="4">
          </div>

          <div class="audit-control-group">
            <label>Dificultad:</label>
            <select class="audit-select audit-select-difficulty" data-idx="${idx}">
              <option value="Fácil" ${q.dificultad === 'Fácil' ? 'selected' : ''}>Fácil</option>
              <option value="Intermedio" ${(!q.dificultad || q.dificultad === 'Intermedio') ? 'selected' : ''}>Intermedio</option>
              <option value="Difícil" ${q.dificultad === 'Difícil' ? 'selected' : ''}>Difícil</option>
            </select>
          </div>
        </div>
      `;

      auditQuestionsContainer.appendChild(card);
    });
  }

  modalAuditPdf.style.display = 'flex';
  modalAuditPdf.setAttribute('aria-hidden', 'false');
}

function closeAuditModal() {
  if (!modalAuditPdf) return;
  modalAuditPdf.style.display = 'none';
  modalAuditPdf.setAttribute('aria-hidden', 'true');
  pendingAuditExam = null;
}

function confirmSaveAuditedExam() {
  if (!pendingAuditExam || !Array.isArray(pendingAuditExam.questions)) {
    closeAuditModal();
    return;
  }

  const finalTitle = inputAuditExamTitle ? (inputAuditExamTitle.value.trim() || pendingAuditExam.title) : pendingAuditExam.title;

  // Leer campos modificados en la auditoría
  const cards = auditQuestionsContainer ? auditQuestionsContainer.querySelectorAll('.audit-question-card') : [];
  cards.forEach(card => {
    const idx = parseInt(card.getAttribute('data-idx'), 10);
    if (!isNaN(idx) && pendingAuditExam.questions[idx]) {
      const selectSpec = card.querySelector('.audit-select-specialty');
      const inputYear = card.querySelector('.audit-input-year');
      const selectDiff = card.querySelector('.audit-select-difficulty');

      if (selectSpec) pendingAuditExam.questions[idx].especialidad = selectSpec.value;
      if (inputYear && inputYear.value.trim()) pendingAuditExam.questions[idx].anio = inputYear.value.trim();
      if (selectDiff) pendingAuditExam.questions[idx].dificultad = selectDiff.value;
    }
  });

  const newExam = {
    id: `custom_${Date.now()}`,
    title: finalTitle,
    isOfficial: false,
    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
    questions: pendingAuditExam.questions
  };

  // Guardar en la lista persistente de exámenes personalizados
  const customExams = getCustomExams();
  customExams.unshift(newExam);
  saveCustomExams(customExams);

  // Actualizar lista global
  ALL_EXAMS.push(newExam);

  closeAuditModal();
  renderDashboard();
  showView('home');

  showToast(`🎉 ¡Examen "${finalTitle}" confirmado con ${newExam.questions.length} preguntas!`);
}

if (btnCloseAuditModal) btnCloseAuditModal.addEventListener('click', closeAuditModal);
if (btnCancelAudit) btnCancelAudit.addEventListener('click', closeAuditModal);
if (btnConfirmSaveExam) btnConfirmSaveExam.addEventListener('click', confirmSaveAuditedExam);

if (modalAuditPdf) {
  modalAuditPdf.addEventListener('click', (e) => {
    if (e.target === modalAuditPdf) closeAuditModal();
  });
}

// =============================================================================
// 10. Módulo 'Modo Mix (Simulacros Personalizados)'
// =============================================================================

function getBankQuestionsBySpecialty() {
  const pool = {};
  SPECIALTIES_LIST.forEach(s => pool[s] = []);

  ALL_EXAMS.forEach(exam => {
    if (exam.isMix) return; // Evitar duplicar simulacros mix previos
    if (Array.isArray(exam.questions)) {
      exam.questions.forEach(q => {
        const spec = q.especialidad || 'Infectología';
        if (!pool[spec]) pool[spec] = [];
        pool[spec].push({
          ...q,
          parentExamTitle: exam.title
        });
      });
    }
  });

  return pool;
}

function updateMixAvailableCount() {
  if (!mixAvailableCount) return;
  const pool = getBankQuestionsBySpecialty();
  let totalAvailable = 0;

  selectedMixSpecialties.forEach(spec => {
    if (pool[spec]) totalAvailable += pool[spec].length;
  });

  mixAvailableCount.textContent = `${totalAvailable} preguntas`;

  if (btnToggleAllSpecialties) {
    const allSelected = selectedMixSpecialties.size === SPECIALTIES_LIST.length;
    btnToggleAllSpecialties.textContent = allSelected ? 'Deseleccionar Todas' : 'Seleccionar Todas';
  }
}

function renderMixSpecialtiesSelector() {
  if (!mixSpecialtiesGrid) return;
  mixSpecialtiesGrid.innerHTML = '';
  const pool = getBankQuestionsBySpecialty();

  SPECIALTIES_LIST.forEach(spec => {
    const count = (pool[spec] || []).length;
    const isChecked = selectedMixSpecialties.has(spec);

    const item = document.createElement('div');
    item.className = `mix-specialty-item ${isChecked ? 'checked' : ''}`;
    item.setAttribute('data-specialty', spec);

    item.innerHTML = `
      <div class="mix-specialty-left">
        <input type="checkbox" class="mix-checkbox" ${isChecked ? 'checked' : ''}>
        <span>${spec}</span>
      </div>
      <span class="mix-spec-count">${count}</span>
    `;

    item.addEventListener('click', (e) => {
      const cb = item.querySelector('.mix-checkbox');
      if (e.target !== cb) {
        cb.checked = !cb.checked;
      }
      if (cb.checked) {
        selectedMixSpecialties.add(spec);
        item.classList.add('checked');
      } else {
        selectedMixSpecialties.delete(spec);
        item.classList.remove('checked');
      }
      updateMixAvailableCount();
    });

    mixSpecialtiesGrid.appendChild(item);
  });

  updateMixAvailableCount();
}

function openModoMixModal() {
  if (!modalModoMix) return;
  renderMixSpecialtiesSelector();
  modalModoMix.style.display = 'flex';
  modalModoMix.setAttribute('aria-hidden', 'false');
}

function closeMixModal() {
  if (!modalModoMix) return;
  modalModoMix.style.display = 'none';
  modalModoMix.setAttribute('aria-hidden', 'true');
}

function startMixExamSession() {
  if (selectedMixSpecialties.size === 0) {
    showToast('⚠️ Selecciona al menos una especialidad médica.');
    return;
  }

  const pool = getBankQuestionsBySpecialty();
  let candidateQuestions = [];

  selectedMixSpecialties.forEach(spec => {
    if (pool[spec]) candidateQuestions.push(...pool[spec]);
  });

  if (candidateQuestions.length === 0) {
    showToast('⚠️ No hay preguntas disponibles para las especialidades seleccionadas.');
    return;
  }

  // Barajar con Fisher-Yates
  const shuffled = shuffleArray(candidateQuestions);
  const sampleCount = Math.min(selectedMixQty, shuffled.length);
  const sampledQuestions = shuffled.slice(0, sampleCount).map((q, idx) => ({
    ...q,
    id: idx + 1
  }));

  const mixExam = {
    id: `mix_${Date.now()}`,
    title: `Simulacro Mix (${sampledQuestions.length} Preguntas)`,
    isOfficial: false,
    isMix: true,
    date: 'Simulacro Adaptativo',
    questions: sampledQuestions
  };

  ALL_EXAMS.push(mixExam);
  closeMixModal();
  startExam(mixExam.id);
  showToast(`🚀 ¡Iniciando Modo Mix con ${sampledQuestions.length} preguntas!`);
}

// Event Listeners Modo Mix
if (btnOpenModoMix) btnOpenModoMix.addEventListener('click', openModoMixModal);
if (btnCloseMixModal) btnCloseMixModal.addEventListener('click', closeMixModal);
if (btnCancelMix) btnCancelMix.addEventListener('click', closeMixModal);
if (btnStartMixExam) btnStartMixExam.addEventListener('click', startMixExamSession);

if (modalModoMix) {
  modalModoMix.addEventListener('click', (e) => {
    if (e.target === modalModoMix) closeMixModal();
  });
}

// Selector de cantidad en Modo Mix (Pills)
const qtyPills = document.querySelectorAll('.btn-qty-pill');
qtyPills.forEach(pill => {
  pill.addEventListener('click', () => {
    qtyPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedMixQty = parseInt(pill.getAttribute('data-qty'), 10) || 10;
  });
});

if (btnToggleAllSpecialties) {
  btnToggleAllSpecialties.addEventListener('click', () => {
    const allSelected = selectedMixSpecialties.size === SPECIALTIES_LIST.length;
    if (allSelected) {
      selectedMixSpecialties.clear();
    } else {
      selectedMixSpecialties = new Set(SPECIALTIES_LIST);
    }
    renderMixSpecialtiesSelector();
  });
}

// =============================================================================
// 9. PWA Lifecycle y Notificaciones
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker activo con scope:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Error al registrar Service Worker:', err);
      });
  });
}

// =============================================================================
// 10. Inicialización
// =============================================================================
initPlatform();
