import { GoogleGenAI } from "@google/genai";
import { HandoverEntry } from "../types";

export const analyzeMaintenanceData = async (entry: HandoverEntry) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "MISSING_API_KEY" });
  const model = ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `
      Eres un asistente experto en gestión operativa y análisis de turnos de trabajo.
      Analiza el siguiente pase de turno y genera un informe profesional y un resumen ejecutivo.

      DATOS DEL PASE DE TURNO:
      Equipo/Área: ${entry.fleet}
      Responsable: ${entry.author}
      Fecha: ${entry.shiftDate}
      Tareas: ${JSON.stringify(entry.ots)}
      Novedades: ${JSON.stringify(entry.notifications)}
      Riesgos identificados: ${entry.frmRisks.join(', ')}
      Notas Generales: ${entry.generalNotes}

      REQUERIMIENTOS DEL ANÁLISIS:
      1. Resumen de tareas completadas vs pendientes.
      2. Identificación de riesgos y puntos de atención para el turno entrante.
      3. Recomendaciones de seguimiento y prioridades de acción.
      4. Índice de avance operativo estimado (0-100%).
      5. Alertas o situaciones que requieren escalada inmediata.

      FORMATO DE RESPUESTA (Markdown):
      # INFORME DE TURNO
      ... (Análisis detallado)

      # RESUMEN EJECUTIVO
      ... (Puntos clave para el turno siguiente)
    `,
    config: {
      temperature: 0.7,
      topP: 0.95,
    }
  });

  const response = await model;
  return response.text;
};
