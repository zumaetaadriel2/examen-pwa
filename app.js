/**
 * QuizMaster PWA - Multi-Examen Platform
 * Dashboard Principal (#view-home), Aleatorización Inteligente con Persistencia,
 * Bolsas de Active Recall Independientes, Detección Offline para Gemini 2.5 Flash
 */

// =============================================================================
// 1. Constantes y Claves de LocalStorage (Sistema Modular por Categorías)
// =============================================================================
const STORAGE_KEY_CATEGORIES = 'pwa_categories';
const STORAGE_KEY_ACTIVE_CATEGORY = 'pwa_active_category';
const STORAGE_KEY_CUSTOM_EXAMS_LEGACY = 'pwa_custom_exams';
const STORAGE_KEY_RANDOM_MODE = 'pwa_random_mode';
const OFFICIAL_EXAM_ID = 'residentado_2026';
const DEFAULT_CATEGORY_RESIDENTADO = 'residentado';
const DEFAULT_CATEGORY_INTERNADO = 'internado';

// Categorías Principales por Defecto
const DEFAULT_CATEGORIES = [
  {
    id: 'residentado',
    name: 'Residentado Médico',
    icon: '🏥',
    description: 'Banco oficial de Residentado Médico con 200 preguntas comentadas.',
    isDefault: true
  },
  {
    id: 'internado',
    name: 'Internado Médico',
    icon: '🩺',
    description: 'Simulacros y bancos clínicos orientados al Internado Médico.',
    isDefault: true
  }
];

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
let ALL_EXAMS = [];              // Exámenes de la categoría activa actualmente
let officialExamBase = null;     // Examen base de 200 preguntas (categoría Residentado)
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
let selectedNewCatIcon = '📁';

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

// Categorías en Dashboard
const categoryTabsList = document.getElementById('categoryTabsList');
const btnOpenNewCategoryModal = document.getElementById('btnOpenNewCategoryModal');
const mixCategoryBadge = document.getElementById('mixCategoryBadge');
const mixBannerTitle = document.getElementById('mixBannerTitle');
const mixBannerDesc = document.getElementById('mixBannerDesc');
const examsSectionTitleText = document.getElementById('examsSectionTitleText');

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
const selectAuditCategory = document.getElementById('selectAuditCategory');
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

// Modal Elements (Nueva Categoría)
const modalNewCategory = document.getElementById('modalNewCategory');
const btnCloseNewCategoryModal = document.getElementById('btnCloseNewCategoryModal');
const btnCancelNewCategory = document.getElementById('btnCancelNewCategory');
const btnSaveNewCategory = document.getElementById('btnSaveNewCategory');
const inputNewCategoryName = document.getElementById('inputNewCategoryName');
const inputNewCategoryDesc = document.getElementById('inputNewCategoryDesc');
const categoryIconPicker = document.getElementById('categoryIconPicker');

// Toasts
const toastContainerEl = document.getElementById('toastContainer');
const toastMessageEl = document.getElementById('toastMessage');
const toastTextEl = document.getElementById('toastText');

// =============================================================================
// 3. Gestión de Categorías y Persistencia Modular
// =============================================================================

function getCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

function saveCategories(categories) {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
}

function getActiveCategoryId() {
  return localStorage.getItem(STORAGE_KEY_ACTIVE_CATEGORY) || DEFAULT_CATEGORY_RESIDENTADO;
}

function setActiveCategoryId(catId) {
  localStorage.setItem(STORAGE_KEY_ACTIVE_CATEGORY, catId);
}

function getCategoryExamsKey(catId) {
  return `categoria_${catId}`;
}

function getCategoryCustomExams(catId) {
  try {
    const raw = localStorage.getItem(getCategoryExamsKey(catId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error leyendo exámenes de categoría:', catId, e);
    return [];
  }
}

function saveCategoryCustomExams(catId, exams) {
  localStorage.setItem(getCategoryExamsKey(catId), JSON.stringify(exams));
}

/**
 * Obtiene todos los exámenes de una categoría (incluyendo el oficial si es Residentado)
 */
function getExamsForCategory(catId) {
  const custom = getCategoryCustomExams(catId);
  if (catId === DEFAULT_CATEGORY_RESIDENTADO && officialExamBase) {
    return [officialExamBase, ...custom];
  }
  return custom;
}

/**
 * Migración automática de datos legacy (pwa_custom_exams -> categoria_residentado)
 */
function migrateLegacyStorage() {
  // 1. Asegurar categorías iniciales
  if (!localStorage.getItem(STORAGE_KEY_CATEGORIES)) {
    saveCategories(DEFAULT_CATEGORIES);
  }
  if (!localStorage.getItem(STORAGE_KEY_ACTIVE_CATEGORY)) {
    setActiveCategoryId(DEFAULT_CATEGORY_RESIDENTADO);
  }

  // 2. Migrar pwa_custom_exams si existe y categoria_residentado aún no
  const legacyCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_EXAMS_LEGACY);
  if (legacyCustom && !localStorage.getItem('categoria_residentado')) {
    try {
      const exams = JSON.parse(legacyCustom);
      if (Array.isArray(exams)) {
        const tagged = exams.map(e => ({ ...e, categoryId: DEFAULT_CATEGORY_RESIDENTADO }));
        saveCategoryCustomExams(DEFAULT_CATEGORY_RESIDENTADO, tagged);
      }
    } catch (e) {
      console.warn('Error en migración de exámenes legacy:', e);
    }
  }

  // 3. Asegurar que categoria_internado exista como array
  if (!localStorage.getItem('categoria_internado')) {
    saveCategoryCustomExams(DEFAULT_CATEGORY_INTERNADO, []);
  }
}

// Active Recall Independiente por Categoría y Examen
function getBolsaRepasoKey(examId, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  return `bolsaRepaso_${cat}_${examId}`;
}

function getBolsaRepasoIds(examId, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  try {
    const key = getBolsaRepasoKey(examId, cat);
    let raw = localStorage.getItem(key);
    // Fallback retroactivo si aún no se guardó con prefijo de categoría
    if (!raw) {
      raw = localStorage.getItem(`bolsaRepaso_${examId}`);
    }
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addToBolsaRepaso(examId, questionId, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  const ids = getBolsaRepasoIds(examId, cat);
  if (!ids.includes(questionId)) {
    ids.push(questionId);
    localStorage.setItem(getBolsaRepasoKey(examId, cat), JSON.stringify(ids));
  }
}

function removeFromBolsaRepaso(examId, questionId, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  let ids = getBolsaRepasoIds(examId, cat);
  if (ids.includes(questionId)) {
    ids = ids.filter(id => id !== questionId);
    localStorage.setItem(getBolsaRepasoKey(examId, cat), JSON.stringify(ids));
  }
}

// Estado del Examen (Respuestas marcadas, índice actual y orden barajado)
function getExamStateKey(examId, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  return `exam_state_${cat}_${examId}`;
}

function getExamState(examId, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  try {
    const key = getExamStateKey(examId, cat);
    let raw = localStorage.getItem(key);
    if (!raw) {
      raw = localStorage.getItem(`exam_state_${examId}`);
    }
    return raw ? JSON.parse(raw) : { currentIndex: 0, answers: {}, isRandom: false, shuffledQuestions: null };
  } catch (e) {
    return { currentIndex: 0, answers: {}, isRandom: false, shuffledQuestions: null };
  }
}

function saveExamState(examId, state, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  localStorage.setItem(getExamStateKey(examId, cat), JSON.stringify(state));
}

function clearExamState(examId, categoryId = null) {
  const cat = categoryId || (currentExam ? currentExam.categoryId : getActiveCategoryId());
  localStorage.removeItem(getExamStateKey(examId, cat));
  localStorage.removeItem(`exam_state_${examId}`);
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

  // 1. Migración y estructura de categorías
  migrateLegacyStorage();

  // 2. Cargar examen oficial desde preguntas.json (asignado a Residentado)
  try {
    const response = await fetch('./preguntas.json');
    const officialQuestions = await response.json();

    officialExamBase = {
      id: OFFICIAL_EXAM_ID,
      title: 'Residentado Médico 2026',
      isOfficial: true,
      categoryId: DEFAULT_CATEGORY_RESIDENTADO,
      date: 'Examen Oficial Comentado',
      questions: officialQuestions
    };

    renderDashboard();
    updateNetworkStatus();
  } catch (err) {
    console.error('Error inicializando examen oficial:', err);
    showToast('⚠️ Error al cargar el examen oficial.');
    renderDashboard();
  }
}

/**
 * Renderiza las pestañas de categorías en el Dashboard
 */
function renderCategoryTabs() {
  if (!categoryTabsList) return;
  categoryTabsList.innerHTML = '';

  const categories = getCategories();
  const activeCatId = getActiveCategoryId();

  categories.forEach(cat => {
    const tab = document.createElement('div');
    tab.className = `category-tab ${cat.id === activeCatId ? 'active' : ''}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', cat.id === activeCatId ? 'true' : 'false');
    tab.setAttribute('data-category-id', cat.id);

    const exams = getExamsForCategory(cat.id);
    const totalQ = exams.reduce((acc, e) => acc + (Array.isArray(e.questions) ? e.questions.length : 0), 0);

    tab.innerHTML = `
      <span class="category-tab-icon">${cat.icon || '📁'}</span>
      <div class="category-tab-info">
        <span class="category-tab-name">${escapeHtml(cat.name)}</span>
        <span class="category-tab-stats">${totalQ} preg • ${exams.length} ${exams.length === 1 ? 'examen' : 'exámenes'}</span>
      </div>
      ${!cat.isDefault ? `
        <button class="btn-delete-cat-pill" data-delete-cat="${cat.id}" title="Eliminar categoría" aria-label="Eliminar categoría">&times;</button>
      ` : ''}
    `;

    tab.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-cat-pill')) return;
      setActiveCategoryId(cat.id);
      renderDashboard();
    });

    const delBtn = tab.querySelector('.btn-delete-cat-pill');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCategory(cat.id);
      });
    }

    categoryTabsList.appendChild(tab);
  });
}

function deleteCategory(catId) {
  const categories = getCategories();
  const cat = categories.find(c => c.id === catId);
  if (!cat || cat.isDefault) return;

  const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar la categoría "${cat.name}" y todos sus exámenes?`);
  if (!confirmDelete) return;

  localStorage.removeItem(getCategoryExamsKey(catId));
  const updatedCats = categories.filter(c => c.id !== catId);
  saveCategories(updatedCats);

  if (getActiveCategoryId() === catId) {
    setActiveCategoryId(DEFAULT_CATEGORY_RESIDENTADO);
  }

  renderDashboard();
  showToast(`🗑️ Categoría "${cat.name}" eliminada.`);
}

/**
 * Renderiza el Dashboard filtrado por la categoría activa
 */
function renderDashboard() {
  renderCategoryTabs();

  const activeCatId = getActiveCategoryId();
  const categories = getCategories();
  const activeCategory = categories.find(c => c.id === activeCatId) || categories[0];

  // Actualizar textos contextuales del Dashboard y Modo Mix
  if (mixCategoryBadge) {
    mixCategoryBadge.textContent = `✨ Simulador Adaptativo • ${activeCategory.name}`;
  }
  if (mixBannerTitle) {
    mixBannerTitle.textContent = `Modo Mix: ${activeCategory.name}`;
  }
  if (mixBannerDesc) {
    mixBannerDesc.textContent = `Combina preguntas del banco acumulado de ${activeCategory.name} con la cantidad que tú elijas.`;
  }
  if (examsSectionTitleText) {
    examsSectionTitleText.textContent = `📚 Exámenes de ${activeCategory.name}`;
  }

  // Obtener exámenes exclusivos de esta categoría
  ALL_EXAMS = getExamsForCategory(activeCatId);

  if (!examsGrid) return;
  examsGrid.innerHTML = '';
  examsTotalCount.textContent = ALL_EXAMS.length;

  // Si la categoría no tiene exámenes aún, renderizar estado vacío amigable
  if (ALL_EXAMS.length === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'category-empty-card';
    emptyCard.innerHTML = `
      <div class="category-empty-icon">${activeCategory.icon || '📁'}</div>
      <h4 class="category-empty-title">Aún no hay exámenes en ${escapeHtml(activeCategory.name)}</h4>
      <p class="category-empty-desc">${escapeHtml(activeCategory.description || 'Sube un documento PDF para estructurar preguntas automáticamente con Gemini IA.')}</p>
      <button class="btn-empty-upload" id="btnUploadInEmptyCategory">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>Subir PDF a ${escapeHtml(activeCategory.name)}</span>
      </button>
    `;

    const emptyUploadBtn = emptyCard.querySelector('#btnUploadInEmptyCategory');
    if (emptyUploadBtn) {
      emptyUploadBtn.addEventListener('click', openUploadModal);
    }

    examsGrid.appendChild(emptyCard);
    return;
  }

  // Renderizar tarjetas de exámenes
  ALL_EXAMS.forEach(exam => {
    const totalQuestions = Array.isArray(exam.questions) ? exam.questions.length : 0;
    const state = getExamState(exam.id, exam.categoryId || activeCatId);
    const answers = state.answers || {};
    const answeredCount = Object.keys(answers).length;

    let correctCount = 0;
    if (Array.isArray(exam.questions)) {
      exam.questions.forEach(q => {
        if (answers[q.id] !== undefined && answers[q.id] === q.respuestaCorrecta) {
          correctCount++;
        }
      });
    }

    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    const recallCount = getBolsaRepasoIds(exam.id, exam.categoryId || activeCatId).length;

    const card = document.createElement('div');
    card.className = 'exam-card';
    card.setAttribute('data-exam-id', exam.id);

    card.innerHTML = `
      <div class="exam-card-top">
        <span class="exam-badge-type ${exam.isOfficial ? 'official' : (exam.isMix ? 'official' : 'custom')}">
          ${exam.isOfficial ? 'Oficial CONAREME' : (exam.isMix ? 'Simulacro Mix' : 'Generado con Gemini')}
        </span>
        ${!exam.isOfficial ? `
          <button class="btn-delete-exam" data-delete-id="${exam.id}" title="Eliminar examen de esta categoría" aria-label="Eliminar examen">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        ` : ''}
      </div>

      <h3 class="exam-card-title">${escapeHtml(exam.title)}</h3>

      <div class="exam-card-meta">
        <span>📝 ${totalQuestions} preguntas</span>
        <span>•</span>
        <span>${escapeHtml(exam.date)}</span>
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

function deleteExam(examId) {
  const activeCatId = getActiveCategoryId();
  const exams = getCategoryCustomExams(activeCatId);
  const exam = exams.find(e => e.id === examId);
  if (!exam) return;

  const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar el examen "${exam.title}" de esta categoría?`);
  if (!confirmDelete) return;

  const updatedExams = exams.filter(e => e.id !== examId);
  saveCategoryCustomExams(activeCatId, updatedExams);

  clearExamState(examId, activeCatId);
  localStorage.removeItem(getBolsaRepasoKey(examId, activeCatId));

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
  const activeCatId = getActiveCategoryId();
  const categoryExams = getExamsForCategory(activeCatId);
  currentExam = categoryExams.find(e => e.id === examId) || ALL_EXAMS.find(e => e.id === examId);
  if (!currentExam) return;

  const catId = currentExam.categoryId || activeCatId;
  isRecallMode = recallOnly;

  if (isRecallMode) {
    const failedIds = getBolsaRepasoIds(examId, catId);
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
    const state = getExamState(examId, catId);

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
      }, catId);
    }

    // Reconstruir userAnswers a partir de los IDs guardados en state.answers
    const currentSavedState = getExamState(examId, catId);
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
    { time: 2500, text: "Analizando contenido con Gemini IA..." },
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

  // Poblar dinámicamente las categorías disponibles en el selector
  if (selectAuditCategory) {
    selectAuditCategory.innerHTML = '';
    const categories = getCategories();
    const activeCatId = getActiveCategoryId();

    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.icon || '📁'} ${cat.name}`;
      if (cat.id === activeCatId) {
        opt.selected = true;
      }
      selectAuditCategory.appendChild(opt);
    });
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
  const targetCategory = selectAuditCategory ? selectAuditCategory.value : getActiveCategoryId();

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
    categoryId: targetCategory,
    isOfficial: false,
    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
    questions: pendingAuditExam.questions
  };

  // Guardar en la lista persistente de la categoría asignada
  const categoryExams = getCategoryCustomExams(targetCategory);
  categoryExams.unshift(newExam);
  saveCategoryCustomExams(targetCategory, categoryExams);

  // Seleccionar la categoría de destino para ver de inmediato el examen
  setActiveCategoryId(targetCategory);

  closeAuditModal();
  renderDashboard();
  showView('home');

  const categories = getCategories();
  const catObj = categories.find(c => c.id === targetCategory);
  const catName = catObj ? catObj.name : 'Categoría';

  showToast(`🎉 ¡Examen "${finalTitle}" guardado en "${catName}" con ${newExam.questions.length} preguntas!`);
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
// 10. Modal para Crear Nueva Categoría / Proyecto (#modalNewCategory)
// =============================================================================

function openNewCategoryModal() {
  if (!modalNewCategory) return;
  if (inputNewCategoryName) inputNewCategoryName.value = '';
  if (inputNewCategoryDesc) inputNewCategoryDesc.value = '';
  selectedNewCatIcon = '📁';

  if (categoryIconPicker) {
    const iconPills = categoryIconPicker.querySelectorAll('.btn-icon-pill');
    iconPills.forEach(p => p.classList.remove('active'));
    const defaultPill = categoryIconPicker.querySelector('[data-icon="📁"]');
    if (defaultPill) defaultPill.classList.add('active');
  }

  modalNewCategory.style.display = 'flex';
  modalNewCategory.setAttribute('aria-hidden', 'false');
  if (inputNewCategoryName) inputNewCategoryName.focus();
}

function closeNewCategoryModal() {
  if (!modalNewCategory) return;
  modalNewCategory.style.display = 'none';
  modalNewCategory.setAttribute('aria-hidden', 'true');
}

function createNewCategory() {
  const name = inputNewCategoryName ? inputNewCategoryName.value.trim() : '';
  if (!name) {
    showToast('⚠️ Ingresa un nombre para la categoría.');
    if (inputNewCategoryName) inputNewCategoryName.focus();
    return;
  }

  const desc = inputNewCategoryDesc ? inputNewCategoryDesc.value.trim() : '';
  const newCatId = `cat_${Date.now()}`;

  const newCategory = {
    id: newCatId,
    name: name,
    icon: selectedNewCatIcon || '📁',
    description: desc || `Banco y simulacros para ${name}.`,
    isDefault: false
  };

  const categories = getCategories();
  categories.push(newCategory);
  saveCategories(categories);

  // Inicializar almacenamiento de exámenes vacío para la categoría
  saveCategoryCustomExams(newCatId, []);

  // Activar la nueva categoría de inmediato
  setActiveCategoryId(newCatId);

  closeNewCategoryModal();
  renderDashboard();
  showToast(`📁 Categoría "${name}" creada exitosamente.`);
}

if (btnOpenNewCategoryModal) btnOpenNewCategoryModal.addEventListener('click', openNewCategoryModal);
if (btnCloseNewCategoryModal) btnCloseNewCategoryModal.addEventListener('click', closeNewCategoryModal);
if (btnCancelNewCategory) btnCancelNewCategory.addEventListener('click', closeNewCategoryModal);
if (btnSaveNewCategory) btnSaveNewCategory.addEventListener('click', createNewCategory);

if (modalNewCategory) {
  modalNewCategory.addEventListener('click', (e) => {
    if (e.target === modalNewCategory) closeNewCategoryModal();
  });
}

if (categoryIconPicker) {
  const iconPills = categoryIconPicker.querySelectorAll('.btn-icon-pill');
  iconPills.forEach(pill => {
    pill.addEventListener('click', () => {
      iconPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedNewCatIcon = pill.getAttribute('data-icon') || '📁';
    });
  });
}

// =============================================================================
// 11. Módulo 'Modo Mix (Simulacros Personalizados)' Aislado por Categoría
// =============================================================================

function getBankQuestionsBySpecialty(catId = null) {
  const targetCatId = catId || getActiveCategoryId();
  const exams = getExamsForCategory(targetCatId);
  const pool = {};
  SPECIALTIES_LIST.forEach(s => pool[s] = []);

  exams.forEach(exam => {
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

  const activeCatId = getActiveCategoryId();
  const pool = getBankQuestionsBySpecialty(activeCatId);
  let candidateQuestions = [];

  selectedMixSpecialties.forEach(spec => {
    if (pool[spec]) candidateQuestions.push(...pool[spec]);
  });

  if (candidateQuestions.length === 0) {
    showToast('⚠️ No hay preguntas disponibles en esta categoría para las especialidades seleccionadas.');
    return;
  }

  // Barajar con Fisher-Yates
  const shuffled = shuffleArray(candidateQuestions);
  const sampleCount = Math.min(selectedMixQty, shuffled.length);
  const sampledQuestions = shuffled.slice(0, sampleCount).map((q, idx) => ({
    ...q,
    id: idx + 1
  }));

  const activeCategory = getCategories().find(c => c.id === activeCatId);
  const catName = activeCategory ? activeCategory.name : 'Categoría';

  const mixExam = {
    id: `mix_${Date.now()}`,
    title: `Simulacro Mix (${sampledQuestions.length} Preguntas) - ${catName}`,
    isOfficial: false,
    isMix: true,
    categoryId: activeCatId,
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
