import { GoogleGenAI, Type } from "@google/genai";
import { HandoverEntry } from "../types";

export const analyzeMaintenanceData = async (entry: HandoverEntry) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "MISSING_API_KEY" });
  const model = ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `
      Eres un experto en inspección estructural bajo normas ANSI, ISO, ASME, API, IRAM y OSHAS con 10 años de experiencia.
      Estás trabajando para una empresa minera en Argentina (Cerro Negro, Santa Cruz: -46.873916, -70.221498) con elevados estándares de seguridad (FRM).

      Analiza el siguiente pase de turno y genera un informe técnico profesional y un resumen ejecutivo.

      DATOS DEL PASE DE TURNO:
      Flota: ${entry.fleet}
      Autor: ${entry.author}
      Fecha: ${entry.timestamp}
      OTs: ${JSON.stringify(entry.ots)}
      Avisos: ${JSON.stringify(entry.notifications)}
      Riesgos FRM: ${entry.frmRisks.join(', ')}
      Notas Generales: ${entry.generalNotes}

      REQUERIMIENTOS DEL ANÁLISIS:
      1. Comparativa técnica basada en estándares:
         - ISO 10816 / ISO 7919 para vibraciones.
         - ISO 18436-7 para termografía.
         - ASTM E1002 para ultrasonido manual.
      2. Definir Índice de Severidad (1 a 5):
         - 1 = Daño superficial sin riesgo estructural.
         - 5 = Riesgo de falla catastrófica inminente.
      3. Proyección y pronóstico: Cálculo de tiempo de vida estimado y tiempos de rotura basados en la criticidad.
      4. Mejores prácticas aplicables para subsanar problemáticas.
      5. Considerar aspectos geoclimáticos de Cerro Negro (clima frío, viento, estacionalidad).
      6. Evaluación bajo principios FRM (Fatality Risk Management).

      FORMATO DE RESPUESTA (Markdown):
      # INFORME TÉCNICO PROFESIONAL
      ... (Detalle técnico, bibliografía, equipos sugeridos)

      # RESUMEN EJECUTIVO
      ... (Puntos clave para gerencia)
    `,
    config: {
      temperature: 0.7,
      topP: 0.95,
    }
  });

  const response = await model;
  return response.text;
};
