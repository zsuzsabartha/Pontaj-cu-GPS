
import { Timesheet, User } from "../types";

// Removed AI dependencies. All logic is now hardcoded/deterministic.

export const generateWorkSummary = async (timesheets: Timesheet[], user: User): Promise<string> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (timesheets.length === 0) {
      return "Nu există date suficiente pentru a genera un sumar.";
  }

  // Basic deterministic calculation
  let totalHours = 0;
  let lateDays = 0;
  let workDays = 0;

  timesheets.forEach(ts => {
      if (ts.endTime) {
          const start = new Date(ts.startTime);
          const end = new Date(ts.endTime);
          const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalHours += duration;
          workDays++;

          // Hardcoded check: if start time is after 09:15, count as late (simplified logic)
          if (start.getHours() > 9 || (start.getHours() === 9 && start.getMinutes() > 15)) {
              // Only counts if detected schedule was Standard
              if (ts.detectedScheduleName?.includes('Standard')) {
                 lateDays++;
              }
          }
      }
  });

  const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;

  return `Sumar Auto-Generat: Angajatul ${user.name} a lucrat ${workDays} zile în perioada recentă, cumulând ${totalHours.toFixed(1)} ore (medie ${avgHours}h/zi). Au fost identificate ${lateDays} posibile întârzieri față de programul standard. Prezența este în general constantă.`;
};

export const checkComplianceAI = async (reason: string): Promise<{valid: boolean, feedback: string}> => {
    // Simple deterministic validation
    if (!reason || reason.length < 5) {
        return { valid: false, feedback: "Motivul este prea scurt. Vă rugăm detaliați." };
    }
    
    const forbiddenWords = ['nimic', 'test', 'bla'];
    if (forbiddenWords.some(w => reason.toLowerCase().includes(w))) {
        return { valid: false, feedback: "Motivul pare invalid. Vă rugăm reformulați." };
    }

    return { valid: true, feedback: "Motivul pare complet și justificat." };
}
