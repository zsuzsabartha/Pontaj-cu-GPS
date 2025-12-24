import { GoogleGenAI } from "@google/genai";
import { Timesheet, User } from "../types";

// Note: In a real app, never expose keys on client. This is for demo purposes.
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateWorkSummary = async (timesheets: Timesheet[], user: User): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // Prepare data for the model
    const dataSummary = timesheets.map(t => ({
      date: t.date,
      start: t.startTime,
      end: t.endTime,
      breaks: t.breaks.length,
      status: t.status,
      distance: t.distanceToOffice
    }));

    const prompt = `
      Ești un asistent HR inteligent. Analizează următoarele date de pontaj pentru angajatul ${user.name}.
      Date: ${JSON.stringify(dataSummary)}
      
      Te rog să generezi un rezumat concis în limba română (max 50 cuvinte) care să evidențieze:
      1. Regularitatea programului.
      2. Dacă există întârzieri sau ore suplimentare evidente (diferență mare între ore).
      3. O notă pozitivă de încurajare.
      
      Nu folosi formatare markdown, doar text simplu.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Nu s-a putut genera analiza.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Serviciul AI indisponibil momentan.";
  }
};

export const checkComplianceAI = async (reason: string): Promise<{valid: boolean, feedback: string}> => {
    try {
        const model = 'gemini-3-flash-preview';
        const prompt = `
          Ești un manager HR. Evaluează următoarea justificare pentru o cerere de concediu: "${reason}".
          Este un motiv valid și profesional?
          Răspunde doar cu un JSON valid: { "valid": boolean, "feedback": "scurt feedback în română" }
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text || "{}";
        return JSON.parse(text);

    } catch (error) {
        return { valid: true, feedback: "Verificare manuală necesară." };
    }
}
