#!/usr/bin/env node
/**
 * One-time import script: parses the 4 English Breakfast Problems PDFs and
 * bulk-inserts them into the breakfast_problems table.
 *
 * Usage (from project root):
 *   node -r dotenv/config scripts/import-breakfast-pdfs.js dotenv_config_path=.env.local
 *
 * Requires: pdftotext (poppler) on PATH and DATABASE_URL in .env.local
 */

const { execSync } = require("child_process");
const { neon } = require("@neondatabase/serverless");

const PDF_PATHS = [
  "C:/Users/qylga/Desktop/Breakfast Problems/English/Craft&Structure.pdf",
  "C:/Users/qylga/Desktop/Breakfast Problems/English/Expresssion-of-Ideas-Breakfast.pdf",
  "C:/Users/qylga/Desktop/Breakfast Problems/English/Information&Ideas-Breakfast.pdf",
  "C:/Users/qylga/Desktop/Breakfast Problems/English/StandardEnglishConventions-Breakfast.pdf",
];

// ── PDF text extraction ───────────────────────────────────────────────────────

function extractText(pdfPath) {
  return execSync(`pdftotext "${pdfPath}" -`, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: 60000,
  });
}

// ── Question block parser (mirrors parse-question-bank.js logic) ─────────────

function parseBlocks(raw) {
  raw = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\f/g, "\n");
  const blocks = raw.split(/(?=Question ID [a-f0-9]+\b)/i).filter((b) => b.trim());

  const rows = [];
  const skipped = [];

  for (const block of blocks) {
    const idMatch = block.match(/Question ID ([a-f0-9]+)/i);
    const externalId = idMatch ? idMatch[1] : "";

    // Category
    let category = "Reading and Writing";
    const domainSection = block.match(/Domain\s*\n([\s\S]*?)(?=\nSkill\b|\nID:)/i);
    if (domainSection) {
      if (/\bmath\b/i.test(domainSection[1].replace(/\n+/g, " "))) category = "Math";
    } else if (/\bmath\b/i.test(block.substring(0, 400))) {
      category = "Math";
    }

    // Skill
    let skill = "";
    const skillMatch = block.match(/Skill\s*\n([^\n]+)/i);
    if (skillMatch) skill = skillMatch[1].trim();

    // Difficulty
    let difficulty = "";
    const diffMatch = block.match(/Question Difficulty:\s*([^\n]+)/i);
    if (diffMatch) difficulty = diffMatch[1].trim();

    // Body (between second ID: marker and answer section)
    const bodyMatch = block.match(/\nID:\s*[a-f0-9]+\n([\s\S]*?)\nID:\s*[a-f0-9]+\s*Answer/i);
    if (!bodyMatch) {
      skipped.push({ externalId, reason: "could not isolate question body" });
      continue;
    }
    const body = bodyMatch[1];

    // Split question text from choices
    const choiceStartMatch = body.match(/(?:^|\n|\?\s*)(A\.)\s/);
    if (!choiceStartMatch) {
      skipped.push({ externalId, reason: "could not find choice A" });
      continue;
    }
    const choiceStartIdx = body.indexOf(choiceStartMatch[1]);
    let questionText = body.substring(0, choiceStartIdx).trim();
    const choicesRaw = body.substring(choiceStartIdx).trim();

    // Parse individual choices A–D
    const markerRe = /\b([A-D])\.\s/g;
    const markers = [];
    let mm;
    while ((mm = markerRe.exec(choicesRaw)) !== null) {
      markers.push({ label: mm[1], index: mm.index });
    }

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
      const start = m.index + m.label.length + 2;
      const end = i + 1 < firstFour.length ? firstFour[i + 1].index : choicesRaw.length;
      return choicesRaw.substring(start, end).replace(/\s+/g, " ").trim();
    });

    const [choiceA, choiceB, choiceC, choiceD] = choiceTexts;

    // Skip questions with empty/trivially short choices (catches stripped Math equations)
    if ([choiceA, choiceB, choiceC, choiceD].some((c) => c.length < 3)) {
      skipped.push({ externalId, reason: "choice text too short (likely stripped equation)" });
      continue;
    }

    // Correct answer
    const answerMatch = block.match(/Correct Answer:\s*([A-D])/i);
    if (!answerMatch) {
      skipped.push({ externalId, reason: "could not find correct answer" });
      continue;
    }
    const correctAnswer = answerMatch[1].toUpperCase();

    questionText = questionText.replace(/\s+/g, " ").trim();

    rows.push({
      external_id: externalId,
      category,
      skill,
      difficulty,
      question: questionText,
      choice_a: choiceA,
      choice_b: choiceB,
      choice_c: choiceC,
      choice_d: choiceD,
      correct_answer: correctAnswer,
    });
  }

  return { rows, skipped };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set. Did you pass dotenv_config_path=.env.local?");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  let allRows = [];
  const allSkipped = [];
  const seenIds = new Set();

  for (const pdfPath of PDF_PATHS) {
    console.log(`\nParsing: ${pdfPath}`);
    let raw;
    try {
      raw = extractText(pdfPath);
    } catch (e) {
      console.error(`  ✗ pdftotext failed: ${e.message}`);
      continue;
    }

    const { rows, skipped } = parseBlocks(raw);
    console.log(`  Found ${rows.length + skipped.length} blocks → ${rows.length} valid, ${skipped.length} skipped`);

    // Cross-PDF deduplication
    const unique = rows.filter((r) => {
      if (seenIds.has(r.external_id)) return false;
      seenIds.add(r.external_id);
      return true;
    });

    allRows = allRows.concat(unique);
    allSkipped.push(...skipped);
  }

  console.log(`\nTotal to insert: ${allRows.length} questions`);

  if (allRows.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  // Bulk insert, one at a time with ON CONFLICT DO NOTHING (mirrors bulkInsertBreakfastProblems)
  let inserted = 0;
  let skippedDb = 0;

  for (const r of allRows) {
    const result = await sql`
      INSERT INTO breakfast_problems
        (question, choice_a, choice_b, choice_c, choice_d, correct_answer,
         category, skill, difficulty, external_id)
      VALUES
        (${r.question}, ${r.choice_a}, ${r.choice_b}, ${r.choice_c}, ${r.choice_d},
         ${r.correct_answer}, ${r.category}, ${r.skill}, ${r.difficulty}, ${r.external_id})
      ON CONFLICT (external_id) DO NOTHING
      RETURNING id
    `;
    if (result.length > 0) inserted++;
    else skippedDb++;
  }

  console.log(`\n✓ Inserted: ${inserted}`);
  if (skippedDb > 0) console.log(`  Already existed (skipped): ${skippedDb}`);
  if (allSkipped.length > 0) {
    console.log(`\n⚠ Parse-level skipped (${allSkipped.length}):`);
    allSkipped.forEach((s) => console.log(`  - ${s.externalId || "unknown"}: ${s.reason}`));
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
