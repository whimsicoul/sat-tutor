import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseNumeric(s: string): number | null {
  const trimmed = s.trim();
  const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const den = parseInt(fractionMatch[2], 10);
    if (den === 0) return null;
    return num / den;
  }
  const n = Number(trimmed);
  return isNaN(n) ? null : n;
}

export function checkOpenEndedAnswer(studentAnswer: string, acceptedAnswers: string[]): boolean {
  const norm = studentAnswer.trim().toLowerCase();
  if (!norm) return false;
  for (const accepted of acceptedAnswers) {
    const normAccepted = accepted.trim().toLowerCase();
    if (norm === normAccepted) return true;
    const na = parseNumeric(norm);
    const nb = parseNumeric(normAccepted);
    if (na !== null && nb !== null && Math.abs(na - nb) <= 1e-4) return true;
  }
  return false;
}
