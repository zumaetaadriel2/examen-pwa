# PWA Quiz & Evaluador Interactivo

Una **Progressive Web App (PWA)** moderna, *mobile-first* y *offline-first*, diseñada específicamente para ofrecer una experiencia fluida e intuitiva en pantallas táctiles de dispositivos móviles. El sistema permite realizar evaluaciones interactivas paso a paso, con retroalimentación instantánea, seguimiento de progreso y fundamento de respuestas al concluir cada prueba.

---

## 🚀 Características Principales

- 📱 **Diseño Mobile-First & Ergonomía Táctil**:
  - Interfaz adaptada con objetivos táctiles amplios (*touch targets* superiores a 52px de altura).
  - Efectos visuales de presión háptica (`transform: scale(0.98)`) y soporte para áreas seguras de pantalla (`safe-area-inset-top` y `safe-area-inset-bottom`).
- ⚡ **Arquitectura Offline-First (Service Worker)**:
  - Cacheo integral de recursos estáticos mediante `sw.js` con estrategia *Cache-First*.
  - La aplicación carga y funciona al 100% sin necesidad de conexión a internet activa.
- 📲 **Instalable en Dispositivos Móviles**:
  - Cumple los estándares de PWA con `manifest.json` (modo `standalone` sin barras de navegación del navegador).
  - Detección automática del evento `beforeinstallprompt` con botón de instalación personalizado.
- 📊 **Progreso en Tiempo Real**:
  - Barra superior dinámica con indicador textual (*"Pregunta X de Y"*) y barra de llenado porcentual animada.
- 🧭 **Navegación Intuitiva**:
  - Visualización de una sola pregunta a la vez para máxima concentración.
  - Botones ergonómicos de *Anterior*, *Siguiente* y *Finalizar Examen*.
- 🎯 **Evaluador y Feedback Instantáneo**:
  - Pantalla final de resultados con cálculo automático de aciertos, errores, precisión porcentual, estatus de aprobación y opción de reintento.
- 📶 **Detector de Conectividad en Vivo**:
  - Indicador dinámico del estado de la red (*En línea / Sin conexión*) con notificaciones flotantes (*toasts*).

---

## 🛠️ Instrucciones para Ejecutar Localmente

Sigue estos sencillos pasos para probar el proyecto en tu entorno de desarrollo:

### 1. Clonar o ingresar al directorio del proyecto
```bash
cd examen-pwa
```

### 2. Instalar dependencias (opcional / no requiere paquetes externos)
```bash
npm install
```

### 3. Iniciar el servidor local
Puedes iniciar el servidor incluido con npm:
```bash
npm start
```
o ejecutando directamente con Node.js:
```bash
node server.js
```

### 4. Abrir en el navegador
Ingresa a la siguiente dirección en tu navegador:
```
http://localhost:3000
```
> **Tip para pruebas móviles en PC**: Presiona `F12` en Google Chrome o Edge y activa la vista de emulación de dispositivos móviles (`Ctrl + Shift + M`) para simular la pantalla de un celular (ej. iPhone 14 Pro o Samsung Galaxy).

---

## 📱 Instrucciones para Instalar en el Celular

Una vez desplegada en un servidor con HTTPS (o accesible en tu red local):

### En Android (Google Chrome)
1. Abre la aplicación en Google Chrome.
2. Si el sistema detecta la compatibilidad PWA, pulsa el botón **"Instalar"** situado en la cabecera superior.
3. Alternativamente, pulsa el menú de los tres puntos verticales (`⋮`) en la esquina superior derecha y selecciona **"Agregar a la pantalla de inicio"** o **"Instalar aplicación"**.
4. La app se agregará a tu cajón de aplicaciones y pantalla de inicio con su icono nativo y se ejecutará a pantalla completa sin la barra del navegador.

### En iOS / iPhone (Safari)
1. Abre la aplicación en el navegador **Safari**.
2. Pulsa el botón de **Compartir** (icono de un cuadro con una flecha hacia arriba en la barra inferior).
3. Desplázate hacia abajo en el menú de opciones y selecciona **"Agregar al inicio"** (*Add to Home Screen*).
4. Confirma el nombre y pulsa **"Agregar"**. La PWA quedará lista para usarse como una app nativa en tu iPhone.

---

## 📁 Estructura del Proyecto

```
examen-pwa/
├── index.html          # Estructura semántica HTML5, metadatos PWA, contenedores accesibles
├── styles.css          # Estilos CSS modernos (variables, dark mode/slate, glassmorphism, mobile layout)
├── app.js              # Lógica de la prueba, control de estados, banco de preguntas y eventos PWA
├── sw.js               # Service Worker con caché offline (Cache-First) y ciclo de vida (install/activate/fetch)
├── manifest.json       # Manifiesto de la aplicación web (nombre, iconos, colores de tema, modo standalone)
├── server.js           # Servidor local Node.js ligero con manejo adecuado de tipos MIME
├── package.json        # Configuración del proyecto y scripts de ejecución
├── .gitignore          # Reglas para excluir dependencias, logs y archivos temporales de Git
└── icons/              # Recursos visuales e iconografía del sistema
    ├── favicon.svg     # Icono de pestaña para el navegador
    ├── icon-192.svg    # Icono PWA en resolución estándar (192x192)
    └── icon-512.svg    # Icono PWA en alta resolución y maskable (512x512)
```

### Detalle de los componentes principales:
- **`index.html`**: Define la arquitectura de una sola página (SPA). Contiene las secciones de cabecera, barra de progreso, tarjeta de pregunta interactiva, barra de navegación fija inferior y la pantalla modal de resultados.
- **`styles.css`**: Implementa una interfaz limpia y atractiva sin dependencias pesadas. Usa variables CSS personalizadas, sombras difuminadas, bordes sutiles y transiciones que aportan una sensación de aplicación nativa.
- **`app.js`**: Orquesta el flujo de la aplicación: carga las preguntas, registra las respuestas del usuario, actualiza la barra de progreso, calcula la calificación final y gestiona el prompt de instalación PWA.
- **`sw.js`**: Permite interceptar las solicitudes de red para responder con los archivos cacheados localmente cuando el dispositivo se queda sin conexión o tiene una red intermitente.
- **`manifest.json`**: Especifica las credenciales de identidad de la PWA ante el sistema operativo móvil (icono de inicio, color de la barra de estado y comportamiento standalone).

---

## 🔮 Próximas Mejoras (Fase 2)

- 📄 **Módulo de Subida y Procesamiento de PDFs**:
  - Permitir a docentes y estudiantes cargar documentos o libros extensos en PDF para extraer texto relevante.
- 🤖 **Generación Automática de Exámenes con Inteligencia Artificial (IA)**:
  - Integración de modelos de lenguaje (LLMs) para sintetizar preguntas de opción múltiple, respuestas fundamentadas y niveles de dificultad a partir del contenido de los PDFs subidos.
- ⏱️ **Modo Temporizador y Examen Cronometrado**:
  - Ajuste de límite de tiempo por pregunta o por evaluación completa con guardado automático.
- 📈 **Historial y Analíticas de Rendimiento**:
  - Almacenamiento local persistente (IndexedDB) de intentos anteriores y estadísticas de progreso académico.
- 🌐 **Soporte Multilenguaje y Modo Oscuro/Claro Dinámico**:
  - Personalización de temas visuales e internacionalización (i18n).