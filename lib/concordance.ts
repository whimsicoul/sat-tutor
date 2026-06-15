// Official College Board SAT-ACT concordance table (2024)
// Each entry: [satScore, actScore] — SAT score is the lower bound of the range
const SAT_TO_ACT_TABLE: [number, number][] = [
  [1570, 36],
  [1530, 35],
  [1490, 34],
  [1450, 33],
  [1420, 32],
  [1390, 31],
  [1350, 30],
  [1310, 29],
  [1260, 28],
  [1220, 27],
  [1180, 26],
  [1140, 25],
  [1100, 24],
  [1060, 23],
  [1020, 22],
  [970, 21],
  [920, 20],
  [880, 19],
  [830, 18],
  [770, 17],
  [720, 16],
  [660, 15],
  [610, 14],
  [560, 13],
  [510, 12],
  [460, 11],
  [400, 10],
];

export function satToAct(satScore: number): number {
  for (const [threshold, act] of SAT_TO_ACT_TABLE) {
    if (satScore >= threshold) return act;
  }
  return 1;
}

export function actToSat(actScore: number): number {
  for (const [sat, act] of SAT_TO_ACT_TABLE) {
    if (act === actScore) return sat;
  }
  // Clamp to nearest match for edge cases
  if (actScore >= 36) return 1570;
  if (actScore <= 1) return 400;
  // Find the closest ACT score
  for (let i = 0; i < SAT_TO_ACT_TABLE.length - 1; i++) {
    const [sat, act] = SAT_TO_ACT_TABLE[i];
    const [, nextAct] = SAT_TO_ACT_TABLE[i + 1];
    if (actScore > nextAct && actScore < act) {
      return sat;
    }
  }
  return 400;
}
