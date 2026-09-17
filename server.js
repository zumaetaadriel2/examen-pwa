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

    const promptText = `Actúa como un médico especialista y docente evaluador de Medicina Interna de alto nivel.
Analiza el documento PDF adjunto y extrae o genera un banco de preguntas clínicas de opción múltiple estructuradas y auditadas para evaluación médica.

Para cada pregunta debes:
1. Extraer o redactar el caso clínico / enunciado con rigor médico.
2. Definir exactamente 4 opciones de respuesta con prefijos "A. ", "B. ", "C. ", "D. ".
3. Auditar rigurosamente la clave de respuesta correcta ("respuestaCorrecta" como índice numérico entero: 0 para A, 1 para B, 2 para C, 3 para D).
4. Clasificar obligatoriamente la pregunta en una de las siguientes 8 especialidades base de Medicina Interna:
   - Gastroenterología
   - Cardiología
   - Neumología
   - Nefrología
   - Hematología
   - Endocrinología
   - Reumatología
   - Infectología
5. Identificar o estimar el año de la convocatoria ("anio", ej. "2024", "2025" o "2026").
6. Evaluar la dificultad médica ("dificultad": obligatoriamente "Fácil", "Intermedio" o "Difícil").
7. Elaborar un fundamento clínico detallado ("fundamentoDetallado") con dos propiedades:
   - "correcta": Justificación clínica profunda de por qué la opción marcada es la correcta basada en guías clínicas y fisiopatología.
   - "descarte": Explicación sintética de por qué las alternativas restantes son incorrectas o contraindicadas.`;

    // Llamada a Gemini 2.5 Flash con Structured Outputs enriquecido
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
              especialidad: {
                type: Type.STRING,
                description: 'Especialidad obligatoria de Medicina Interna: Gastroenterología, Cardiología, Neumología, Nefrología, Hematología, Endocrinología, Reumatología, Infectología'
              },
              anio: {
                type: Type.STRING,
                description: 'Año de la pregunta (ej. 2024, 2025, 2026)'
              },
              dificultad: {
                type: Type.STRING,
                description: 'Nivel de dificultad médica: Fácil, Intermedio, Difícil'
              },
              fundamentoDetallado: {
                type: Type.OBJECT,
                properties: {
                  correcta: {
                    type: Type.STRING,
                    description: 'Explicación de por qué la opción es la correcta'
                  },
                  descarte: {
                    type: Type.STRING,
                    description: 'Explicación de por qué se descartan las demás alternativas'
                  }
                },
                required: ['correcta', 'descarte']
              }
            },
            required: [
              'id',
              'pregunta',
              'opciones',
              'respuestaCorrecta',
              'especialidad',
              'anio',
              'dificultad',
              'fundamentoDetallado'
            ]
          }
        }
      }
    });

    const generatedQuestions = JSON.parse(response.text);

    const VALID_SPECIALTIES = [
      'Gastroenterología', 'Cardiología', 'Neumología', 'Nefrología',
      'Hematología', 'Endocrinología', 'Reumatología', 'Infectología'
    ];

    // Formatear IDs y garantizar consistencia de metadatos clínicos
    const formattedQuestions = generatedQuestions.map((q, idx) => {
      let especialidad = q.especialidad || 'Infectología';
      if (!VALID_SPECIALTIES.includes(especialidad)) {
        const match = VALID_SPECIALTIES.find(s => especialidad.toLowerCase().includes(s.toLowerCase().slice(0, 5)));
        especialidad = match || 'Gastroenterología';
      }

      const correctaDesc = q.fundamentoDetallado?.correcta || 'Opción correcta respaldada por guías clínicas.';
      const descarteDesc = q.fundamentoDetallado?.descarte || 'Las demás opciones no corresponden al manejo o diagnóstico de elección.';

      return {
        id: q.id || (idx + 1),
        pregunta: q.pregunta,
        opciones: q.opciones,
        respuestaCorrecta: typeof q.respuestaCorrecta === 'number' ? q.respuestaCorrecta : 0,
        especialidad,
        anio: q.anio || '2024',
        dificultad: ['Fácil', 'Intermedio', 'Difícil'].includes(q.dificultad) ? q.dificultad : 'Intermedio',
        fundamentoDetallado: {
          correcta: correctaDesc,
          descarte: descarteDesc
        },
        fundamento: `${correctaDesc} Descarte: ${descarteDesc}`
      };
    });

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

    const targetCategory = (req.body && (req.body.categoria || req.body.categoryId))
      ? String(req.body.categoria || req.body.categoryId).trim()
      : 'residentado';

    return res.json({
      success: true,
      filename: pdfFile.name,
      categoria: targetCategory,
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
