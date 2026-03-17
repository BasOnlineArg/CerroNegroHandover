
import { GoogleGenAI } from "@google/genai";

/**
 * Analiza datos de mantenimiento utilizando Gemini 3 Pro enfocado en inspección estructural.
 * Cumple con estándares mineros de Argentina y principios FRM.
 */
export const analyzeMaintenanceData = async (data: string, type: string) => {
  // Use named parameter for apiKey and direct initialization.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    P (Persona): Eres un experto en inspección estructural bajo normas ANSI, ISO, ASME, API, IRAM y OSHAS con 10 años de experiencia.
    
    E (Entorno): Empresa minera en Santa Cruz, Argentina (Cerro Negro). Ubicación: -46.873916, -70.221498. 
    Tener en cuenta aspectos geoclimáticos (vientos de 100km/h, temperaturas extremas, salinidad) para fatiga de materiales y lubricación.
    
    S (Pasos):
    1. Comparar hallazgos con estándares industriales y mejores prácticas.
    2. Evaluar calidad de imágenes reportadas (foco, saturación). Sugerir herramientas de realce si se mencionan fallas visuales.
    3. Análisis Especializado:
       - Vibraciones: Estándares ISO 10816 / ISO 7919.
       - Termografía: Estándar ISO 18436-7.
       - Ultrasonido: Estándar ASTM E1002.
    4. Proyecciones: Generar gráficas descriptivas de tendencia (en texto), calcular RUL (Remaining Useful Life), tiempos de rotura y mejores prácticas.
    5. Índice de Criticidad Estructural (1 a 5):
       - 1 = Daño superficial sin riesgo estructural.
       - 5 = Riesgo de falla catastrófica inminente.
    6. FRM (Fatality Risk Management): Asegurar que todas las tareas y recomendaciones cumplan con el control de riesgos críticos definidos.
    
    T (Tono) y Entregables:
    - Estrictamente formal, profesional y respaldado técnicamente.
    - Generar ambos por separado: A) Informe Técnico Detallado, B) Resumen Ejecutivo.
    - Incluir bibliografía y apartado de equipos utilizados (boroscopio, cámara térmica, vibrómetro, etc.).
    - NO inventar respuestas; solicitar información adicional si los datos son insuficientes.
  `;

  try {
    // Calling generateContent with the model and contents directly.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Flota: ${type}\nReporte Técnico del Turno:\n${data}`,
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    // Directly access the .text property from the response object.
    return response.text || "Análisis no disponible en este momento.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Error en la conexión con el motor de inteligencia técnica.";
  }
};
