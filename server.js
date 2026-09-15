/**
 * Server Node.js - QuizMaster PWA
 * Express, Static Files, PWA Support y Generación de Exámenes con Gemini API
 */

require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares para procesar JSON y subida de archivos (hasta 50 MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: false,
  abortOnLimit: true
}));

// Archivos estáticos con cabeceras PWA adecuadas
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

/**
 * POST /api/generar-examen
 * Procesa un archivo PDF enviado y utiliza el SDK @google/genai con gemini-2.5-flash
 * para generar automáticamente preguntas estructuradas con fundamentación.
 */
app.post('/api/generar-examen', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'tu_clave_aqui') {
      return res.status(400).json({
        success: false,
        error: 'No se ha configurado una GEMINI_API_KEY válida en el archivo .env del servidor.'
      });
    }

    if (!req.files || !req.files.pdf) {
      return res.status(400).json({
        success: false,
        error: 'No se recibió ningún archivo PDF. Por favor selecciona un documento.'
      });
    }

    const pdfFile = req.files.pdf;
    const isPdf = pdfFile.mimetype.includes('pdf') || pdfFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return res.status(400).json({
        success: false,
        error: 'El archivo enviado no es un documento PDF válido.'
      });
    }

    console.log(`[Gemini] Procesando PDF: "${pdfFile.name}" (${(pdfFile.size / 1024).toFixed(1)} KB)`);

    // Convertir el buffer del PDF a Base64
    const pdfBase64 = pdfFile.data.toString('base64');

    // Inicializar SDK oficial de Gemini
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    const promptText = "Genera o extrae un cuestionario de opción múltiple con su clave de respuesta correcta y el fundamento de cada pregunta basándote en el documento. Asegúrate de incluir 4 opciones con letras A, B, C, D, la respuesta correcta como índice numérico (0 para A, 1 para B, 2 para C, 3 para D), y una justificación o fundamento clínico/técnico detallado para cada pregunta.";

    // Llamada a Gemini 2.5 Flash con Structured Outputs
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64
          }
        },
        promptText
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              pregunta: { type: Type.STRING },
              opciones: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              respuestaCorrecta: { type: Type.INTEGER },
              fundamento: { type: Type.STRING }
            },
            required: ['id', 'pregunta', 'opciones', 'respuestaCorrecta', 'fundamento']
          }
        }
      }
    });

    const generatedQuestions = JSON.parse(response.text);

    // Formatear IDs secuenciales si fuera necesario
    const formattedQuestions = generatedQuestions.map((q, idx) => ({
      id: q.id || (idx + 1),
      pregunta: q.pregunta,
      opciones: q.opciones,
      respuestaCorrecta: q.respuestaCorrecta,
      fundamento: q.fundamento
    }));

    console.log(`[Gemini] Generadas exitosamente ${formattedQuestions.length} preguntas.`);

    // Opcional: Si el usuario desea persistir en el servidor preguntas_generadas.json
    try {
      fs.writeFileSync(
        path.join(__dirname, 'preguntas_generadas.json'),
        JSON.stringify(formattedQuestions, null, 2),
        'utf-8'
      );
    } catch (saveErr) {
      console.warn('No se pudo escribir preguntas_generadas.json en disco:', saveErr);
    }

    return res.json({
      success: true,
      filename: pdfFile.name,
      total: formattedQuestions.length,
      preguntas: formattedQuestions
    });

  } catch (err) {
    console.error('[Gemini] Error durante la generación:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error al comunicarse con la API de Gemini.'
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
