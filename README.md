# QuizMaster: Plataforma AI de Banqueo & Simulador Médico (PWA)

[![PWA](https://img.shields.io/badge/PWA-Ready-4f46e5?style=flat-square&logo=pwa)](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
[![Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-06b6d4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Offline First](https://img.shields.io/badge/Offline-quizmaster--pwa--v6-10b981?style=flat-square)](sw.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

**QuizMaster** es una **Progressive Web App (PWA)** de alto rendimiento diseñada para la preparación médica de alta exigencia (Residentado Médico, Internado Médico, ENAM, EsSalud). Integra una **arquitectura multi-proyecto**, procesamiento automatizado de PDFs mediante **Gemini 2.5 Flash**, auditoría médica de claves y alternativas, generador adaptativo **Modo Mix** y un sistema de estudio basado en **Active Recall (Repaso Activo)** con funcionamiento 100% offline.

---

## 🌟 Características Clave

### 1. 📁 Arquitectura de Proyectos y Categorías Independientes
- **Aislamiento Total de Bancos**: Cada categoría funciona como un contenedor o proyecto independiente que almacena sus propios exámenes, banco acumulado de preguntas, historial y bolsas de Active Recall.
- **Categorías Predeterminadas Protegidas**:
  - 🏥 **Residentado Médico**: Incluye el examen oficial comentado de 200 preguntas desglosadas.
  - 🩺 **Internado Médico**: Entorno limpio y preparado para bancos de pre-internado.
- **Creación Dinámica de Nuevas Categorías (`+ Nueva Categoría`)**:
  - Los usuarios pueden crear entornos de estudio personalizados (ej. *ENAM 2026*, *EsSalud*, *Medicina 2027*), asignándoles un icono identificador temático (📁, 🏥, 🩺, 📚, 🔬, 💊, 🧠, 🎯).
  - Las categorías personalizadas pueden eliminarse de forma segura sin afectar a los demás proyectos.

---

### 2. 🤖 Auditoría de PDFs Impulsada por IA (Gemini 2.5 Flash)
- **Extracción Estructurada con el SDK `@google/genai`**: Procesa exámenes médicos en PDF convirtiéndolos a Base64 y consultando el modelo `gemini-2.5-flash` con esquema de respuesta estricto (`responseSchema`).
- **Auditoría Clínica de Claves**: La IA audita el documento para detectar o verificar la respuesta correcta (índice 0 a 3 para opciones A, B, C, D).
- **Clasificación en 8 Especialidades Base de Medicina Interna**:
  1. Gastroenterología
  2. Cardiología
  3. Neumología
  4. Nefrología
  5. Hematología
  6. Endocrinología
  7. Reumatología
  8. Infectología
- **Estimación de Año y Nivel de Dificultad**: Detección del año de examen y graduación clínica cromática: Fácil (🟢), Intermedio (🟡) o Difícil (🔴).
- **Fundamentación Clínica Desglosada**:
  - ✔ **¿Por qué es la opción correcta?**: Justificación médica, fisiopatológica o normativa de la clave.
  - ✖ **Descarte de alternativas**: Explicación puntual de por qué las alternativas restantes son incorrectas.

---

### 3. 🩺 Modal de Auditoría y Clasificación Manual
- Previo al guardado en el banco, el sistema abre la vista de auditoría (`#modalAuditPdf`):
  - **Asignación de Categoría Destino**: Selector desplegable para dirigir el examen al proyecto correspondiente (ej. asignarlo a *Internado Médico* o a una categoría personalizada).
  - **Edición Manual**: Permite reclasificar la especialidad, ajustar el año o modificar la dificultad de cada pregunta individual.
  - **Verificación de Clave**: Badge visible con la letra correcta detectada.

---

### 4. 🔀 Simulador Adaptativo (Modo Mix) Aislado por Categoría
- **Generador de Pruebas Personalizadas**: Permite configurar un simulacro seleccionando:
  - **Cantidad de preguntas**: 10, 20, 50 o 100 preguntas.
  - **Filtro de especialidades**: Rejilla interactiva con las 8 especialidades y contador en tiempo real de preguntas disponibles.
- **Aislamiento Estricto**: El Modo Mix extrae preguntas **únicamente** del banco acumulado de la categoría activa, evitando mezclar temas de diferentes proyectos.

---

### 5. 🧠 Active Recall & Repaso Inteligente
- **Bolsa de Preguntas Falladas**: Cada examen registra las preguntas respondidas incorrectamente en una lista persistente (`bolsaRepaso_${catId}_${examId}`).
- **Modo Repaso Activo**: Permite reintentar exclusivamente las preguntas falladas hasta dominar el contenido. Al acertarlas, se retiran automáticamente de la bolsa.
- **Aleatorización Inteligente (Algoritmo Fisher-Yates)**: Toggle global de *Modo Aleatorio* que permuta tanto el orden de las preguntas como el de las alternativas (A, B, C, D), recalculando automáticamente la clave correcta.

---

### 6. ⚡ Soporte Offline PWA & Detección de Red
- **Service Worker (`quizmaster-pwa-v6`)**: Estrategia de caché *Network-First* con fallback a caché local para un arranque instantáneo sin conexión.
- **Detección Inteligente de Red**:
  - Si el dispositivo pierde la conexión, el botón *Cargar PDF* se deshabilita automáticamente y muestra un tooltip explicativo, protegiendo al usuario de fallos con la API de Gemini.
  - Al restaurar la conexión, se habilita nuevamente y emite una notificación *toast*.

---

## 🛠️ Guía de Instalación y Uso Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).
- Una clave de API de Google Gemini ([Google AI Studio](https://aistudio.google.com/)).

### 1. Clonar el repositorio
```bash
git clone https://github.com/zumaetaadriel2/examen-pwa.git
cd examen-pwa
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto con tu API Key de Gemini:
```env
GEMINI_API_KEY=tu_clave_de_api_aqui
PORT=3000
```

### 4. Iniciar el servidor
```bash
npm start
```
o directamente con Node:
```bash
node server.js
```

### 5. Abrir la aplicación
Ingresa desde tu navegador a:
```
http://localhost:3000
```

---

## 📱 Instrucciones para Instalación PWA en Móviles

La plataforma cumple con los estándares web modernos y puede instalarse como una aplicación nativa en dispositivos móviles y de escritorio:

### En Android (Google Chrome)
1. Abre [http://localhost:3000](http://localhost:3000) (o el dominio público donde esté alojada con HTTPS) en Google Chrome.
2. Toca el botón **"Instalar"** que aparece en la cabecera superior de la aplicación.
3. Si no aparece, abre el menú de tres puntos (`⋮`) en la esquina superior derecha del navegador y selecciona **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
4. La aplicación se ejecutará a pantalla completa (*standalone*), sin barra de direcciones y con acceso desde el cajón de apps.

### En iOS / iPhone (Safari)
1. Abre el enlace de la aplicación en el navegador **Safari**.
2. Toca el botón de **Compartir** (icono de un recuadro con flecha hacia arriba en la barra inferior).
3. Desplázate hacia abajo en el menú de opciones y selecciona **"Agregar al inicio"** (*Add to Home Screen*).
4. Confirma el nombre deseado y presiona **"Agregar"**. La app se añadirá a la pantalla de inicio de tu iPhone o iPad con su icono oficial.

---

## 📂 Estructura de Archivos del Proyecto

```
examen-pwa/
├── server.js           # Servidor backend Express: endpoints de API, llamada a Gemini 2.5 Flash y subida de PDFs
├── app.js              # Controlador cliente PWA: categorías, dashboard, Modo Mix, Active Recall y navegación
├── index.html          # Estructura semántica SPA: vistas principales, barra de progreso y modales interactivos
├── styles.css          # Sistema de diseño UI/UX: glassmorphism, responsive mobile-first, badges y animaciones
├── preguntas.json      # Banco oficial inicial de 200 preguntas comentadas (Residentado Médico)
├── sw.js               # Service Worker (quizmaster-pwa-v6) para caché offline y soporte PWA
├── manifest.json       # Manifiesto de la aplicación (nombre, tema #4f46e5, iconos y modo standalone)
├── package.json        # Dependencias del proyecto (@google/genai, express, express-fileupload, dotenv)
├── .env                # Variables de entorno confidenciales (GEMINI_API_KEY)
└── icons/              # Iconografía PWA y Favicons vectoriales (SVG)
    ├── favicon.svg     # Icono de pestaña del navegador
    ├── icon-192.svg    # Icono PWA en 192x192
    └── icon-512.svg    # Icono PWA en 512x512
```

---

## 🧪 Resumen de Tecnologías

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 | Alto rendimiento, cero dependencias pesadas, carga inmediata |
| **Backend** | Node.js, Express.js | Servidor HTTP y API REST ligera |
| **Inteligencia Artificial** | `@google/genai` (Gemini 2.5 Flash) | Extracción de PDFs, auditoría de claves y justificaciones médicas |
| **PWA & Offline** | Service Worker Cache API, Web App Manifest | Funcionamiento autónomo sin conexión a internet |
| **Almacenamiento Local** | `localStorage` con claves prefijadas | Persistencia modular por categoría (`categoria_${id}`, `bolsaRepaso_${catId}_${examId}`) |

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE).