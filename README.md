# QuizMaster PWA - Evaluador Interactivo Mobile-First

Aplicación Web Progresiva (PWA) responsiva y optimizada para pantallas táctiles de celulares, diseñada con estética moderna, tipografía nítida y soporte offline completo.

## Características

- 📱 **Diseño Mobile-First**: Optimizado para dispositivos móviles con áreas táctiles amplias (touch targets de >52px) y márgenes seguros (`safe-area-inset`).
- ❓ **Una pregunta a la vez**: Flujo paso a paso con transiciones fluidas.
- 📊 **Barra de progreso superior**: Indicador "Pregunta X de Y" con barra de llenado porcentual dinámico.
- 🃏 **Tarjetas de respuesta interactivas**: Opciones de gran tamaño con insignias de letras (A, B, C, D), selector de radio animado y respuesta háptica táctil.
- 🧭 **Navegación completa**: Botones de "Anterior", "Siguiente" y "Finalizar Examen" adaptables.
- 🏆 **Pantalla de resultados**: Resumen con puntuación porcentual, desglose de aciertos, precisión y botón para reintentar.
- ⚡ **Soporte Offline (PWA)**: Implementación de Service Worker (`sw.js`) con estrategia *Cache-First* para funcionar 100% sin internet.
- 📲 **Instalable**: Manifiesto web (`manifest.json`) y detector de evento `beforeinstallprompt` con botón personalizado para instalar en la pantalla de inicio.
- 📶 **Detector de conectividad**: Indicador dinámico de estado de red (En línea / Sin conexión) con avisos flotantes (toasts).

## Estructura de Archivos

```
examen-pwa/
├── index.html          # Estructura semántica accesible y mobile-first
├── styles.css          # Estilos modernos con CSS puro (variables, glassmorphism, mobile layout)
├── app.js              # Lógica de la prueba, estado reactivo y eventos PWA
├── manifest.json       # Configuración de instalación PWA standalone
├── sw.js               # Service Worker con caché offline
├── server.js           # Servidor local ligero de desarrollo
├── package.json        # Configuración de scripts npm
└── icons/              # Recursos gráficos e iconos del manifiesto
    ├── favicon.svg
    ├── icon-192.svg
    └── icon-512.svg
```

## Cómo Ejecutar Localmente

1. En la terminal, ejecuta:
   ```bash
   npm start
   ```
   o bien:
   ```bash
   node server.js
   ```

2. Abre en tu navegador (o emulador de dispositivo móvil en Chrome DevTools / F12):
   ```
   http://localhost:3000
   ```

3. **Para probar el soporte Offline**:
   - Abre las herramientas de desarrollador (`F12` -> pestaña **Network** o **Red**).
   - Marca la opción **Offline**.
   - Notarás que el indicador cambia a "Sin conexión" y podrás continuar respondiendo y recargando la aplicación sin conexión.