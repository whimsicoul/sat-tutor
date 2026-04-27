#!/usr/bin/env node
/**
 * Parses a MyPractice Question Bank PDF into a CSV ready for bulk import.
 *
 * Usage:
 *   node scripts/parse-question-bank.js "path/to/file.pdf" [output.csv]
 *
 * Requires: pdftotext (poppler) to be on PATH.
 * Output CSV columns:
 *   external_id, category, skill, difficulty, question,
 *   choice_a, choice_b, choice_c, choice_d, correct_answer
 */

const { execSync } = require("child_process");
const fs = require("fs");

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/parse-question-bank.js <pdf-path> [output.csv]");
  process.exit(1);
}
const outPath = process.argv[3] || pdfPath.replace(/\.pdf$/i, ".csv");

// ── Extract text ─────────────────────────────────────────────────────────────
console.log(`Extracting text from: ${pdfPath}`);
let raw;
try {
  raw = execSync(`pdftotext "${pdfPath}" -`, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
} catch (e) {
  console.error("pdftotext failed. Make sure poppler is installed and on PATH.");
  process.exit(1);
}

// Normalise line endings and remove form-feed characters
raw = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\f/g, "\n");

// ── Split into per-question blocks ───────────────────────────────────────────
const blocks = raw.split(/(?=Question ID [a-f0-9]+\b)/i).filter((b) => b.trim());
console.log(`Found ${blocks.length} question blocks.`);

// ── CSV helper ───────────────────────────────────────────────────────────────
function csvField(s) {
  const str = (s == null ? "" : String(s)).replace(/\s+/g, " ").trim().replace(/"/g, '""');
  return `"${str}"`;
}

// ── Parse each block ──────────────────────────────────────────────────────────
const rows = [];
const skipped = [];

for (const block of blocks) {
  // External ID
  const idMatch = block.match(/Question ID ([a-f0-9]+)/i);
  const externalId = idMatch ? idMatch[1] : "";

  // ── Category (Math vs Reading and Writing) ───────────────────────────────
  let category = "Reading and Writing";
  const domainSection = block.match(/Domain\s*\n([\s\S]*?)(?=\nSkill\b|\nID:)/i);
  if (domainSection) {
    const domainText = domainSection[1].replace(/\n+/g, " ");
    if (/\bmath\b/i.test(domainText)) category = "Math";
  } else if (/\bmath\b/i.test(block.substring(0, 400))) {
    category = "Math";
  }

  // ── Skill ────────────────────────────────────────────────────────────────
  let skill = "";
  const skillMatch = block.match(/Skill\s*\n([^\n]+)/i);
  if (skillMatch) skill = skillMatch[1].trim();

  // ── Difficulty ───────────────────────────────────────────────────────────
  let difficulty = "";
  const diffMatch = block.match(/Question Difficulty:\s*([^\n]+)/i);
  if (diffMatch) difficulty = diffMatch[1].trim();

  // ── Body: everything after "ID: <hex>" line up to the answer section ─────
  // There are two "ID:" occurrences: one in the header, one before the question.
  // We want everything after the SECOND "ID: <hex>" up to "ID: <hex> Answer"
  const bodyMatch = block.match(/\nID:\s*[a-f0-9]+\n([\s\S]*?)\nID:\s*[a-f0-9]+\s*Answer/i);
  if (!bodyMatch) {
    skipped.push({ externalId, reason: "could not isolate question body" });
    continue;
  }
  const body = bodyMatch[1];

  // ── Split body into question text + choices ───────────────────────────────
  // Choices always start with "A." somewhere in the body (possibly after a prompt).
  // Find the position of the first choice marker " A. " or "\nA. " or "? A."
  const choiceStartMatch = body.match(/(?:^|\n|\?\s*)(A\.)\s/);
  if (!choiceStartMatch) {
    skipped.push({ externalId, reason: "could not find choice A" });
    continue;
  }

  const choiceStartIdx = body.indexOf(choiceStartMatch[1]);
  let questionText = body.substring(0, choiceStartIdx).trim();
  const choicesRaw = body.substring(choiceStartIdx).trim();

  // ── Parse individual choices ─────────────────────────────────────────────
  // Strategy: find all "X. " markers and slice between them.
  // We collect the positions of A. B. C. D. in the choices string.
  const markerRe = /\b([A-D])\.\s/g;
  const markers = [];
  let mm;
  while ((mm = markerRe.exec(choicesRaw)) !== null) {
    markers.push({ label: mm[1], index: mm.index });
  }

  // Keep only the first A, B, C, D (there may be extra from rationale text)
  const seen = new Set();
  const firstFour = [];
  for (const marker of markers) {
    if (!seen.has(marker.label)) {
      seen.add(marker.label);
      firstFour.push(marker);
    }
    if (firstFour.length === 4) break;
  }

  if (firstFour.length !== 4) {
    skipped.push({ externalId, reason: `found only ${firstFour.length} choices` });
    continue;
  }

  const choiceTexts = firstFour.map((m, i) => {
    const start = m.index + m.label.length + 2; // skip "X. "
    const end = i + 1 < firstFour.length ? firstFour[i + 1].index : choicesRaw.length;
    return choicesRaw.substring(start, end).replace(/\s+/g, " ").trim();
  });

  const [choiceA, choiceB, choiceC, choiceD] = choiceTexts;

  // ── Correct answer ────────────────────────────────────────────────────────
  const answerMatch = block.match(/Correct Answer:\s*([A-D])/i);
  if (!answerMatch) {
    skipped.push({ externalId, reason: "could not find correct answer" });
    continue;
  }
  const correctAnswer = answerMatch[1].toUpperCase();

  // ── Clean question text ───────────────────────────────────────────────────
  // Remove any trailing "Which choice..." prompt that got mixed into question
  questionText = questionText.replace(/\s+/g, " ").trim();

  rows.push({ externalId, category, skill, difficulty, question: questionText, choiceA, choiceB, choiceC, choiceD, correctAnswer });
}

// ── Write CSV ─────────────────────────────────────────────────────────────────
const header = "external_id,category,skill,difficulty,question,choice_a,choice_b,choice_c,choice_d,correct_answer";
const csvLines = rows.map((r) =>
  [
    csvField(r.externalId),
    csvField(r.category),
    csvField(r.skill),
    csvField(r.difficulty),
    csvField(r.question),
    csvField(r.choiceA),
    csvField(r.choiceB),
    csvField(r.choiceC),
    csvField(r.choiceD),
    csvField(r.correctAnswer),
  ].join(",")
);

fs.writeFileSync(outPath, [header, ...csvLines].join("\n"), "utf8");

console.log(`\n✓ Parsed ${rows.length} questions → ${outPath}`);
if (skipped.length) {
  console.warn(`\n⚠ Skipped ${skipped.length} blocks:`);
  skipped.forEach((s) => console.warn(`  - ${s.externalId || "unknown"}: ${s.reason}`));
}
