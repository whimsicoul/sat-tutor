// Shared parser for College Board question-bank PDFs.
// Each question starts at the top of a new page (confirmed by format).
// Structure per block:
//   "Question ID <hex>"  ← header
//   chart row (Assessment | Test Section | Domain | Skill | Difficulty)
//   "ID: <hex>"          ← first blue box
//   question text + A. B. C. D. choices
//   "ID: <hex> Answer"   ← second blue box
//   "Correct Answer: X"
//   "Rationale"
//   explanation text

function clean(s: string) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\f/g, '\n');
}

export interface ParsedQuestion {
  external_id: string;
  category: string;
  skill: string;
  difficulty: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  rationale: string;
  /** 1-based page index this question starts on (one question per page) */
  page_number: number;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  skipped: { external_id: string; reason: string }[];
}

export function parseQuestionBankPdf(rawText: string): ParseResult {
  const normalised = clean(rawText);
  // Split on "Question ID <hex>" — each block is one question
  const rawBlocks = normalised.split(/(?=Question ID [a-f0-9]+\b)/i).filter((b) => b.trim());

  const questions: ParsedQuestion[] = [];
  const skipped: { external_id: string; reason: string }[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];
    const pageNumber = i + 1; // one question per page, 1-based

    const idMatch = block.match(/Question ID ([a-f0-9]+)/i);
    const external_id = idMatch?.[1] ?? '';

    // Category
    let category = 'Reading and Writing';
    const domainSection = block.match(/Domain\s*\n([\s\S]*?)(?=\nSkill\b|\nID:)/i);
    if (domainSection) {
      if (/\bmath\b/i.test(domainSection[1])) category = 'Math';
    } else if (/\bmath\b/i.test(block.substring(0, 400))) {
      category = 'Math';
    }

    // Skill
    const skillMatch = block.match(/Skill\s*\n([^\n]+)/i);
    const skill = skillMatch?.[1].trim() ?? '';

    // Difficulty
    const diffMatch = block.match(/Question Difficulty:\s*([^\n]+)/i);
    const difficulty = diffMatch?.[1].trim() ?? '';

    // Body between second "ID: <hex>" and the "ID: <hex> Answer" box
    const bodyMatch = block.match(/\nID:\s*[a-f0-9]+\n([\s\S]*?)\nID:\s*[a-f0-9]+\s*Answer/i);
    if (!bodyMatch) {
      skipped.push({ external_id, reason: 'could not isolate question body' });
      continue;
    }
    const body = bodyMatch[1];

    // Find where choice A starts
    const choiceStartMatch = body.match(/(?:^|\n|\?\s*)(A\.)\s/);
    if (!choiceStartMatch) {
      skipped.push({ external_id, reason: 'could not find choice A' });
      continue;
    }
    const choiceStartIdx = body.indexOf(choiceStartMatch[1]);
    const question = body.substring(0, choiceStartIdx).replace(/\s+/g, ' ').trim();
    const choicesRaw = body.substring(choiceStartIdx).trim();

    // Locate A B C D markers
    const markerRe = /\b([A-D])\.\s/g;
    const markers: { label: string; index: number }[] = [];
    let mm: RegExpExecArray | null;
    while ((mm = markerRe.exec(choicesRaw)) !== null) {
      markers.push({ label: mm[1], index: mm.index });
    }
    const seen = new Set<string>();
    const firstFour: { label: string; index: number }[] = [];
    for (const marker of markers) {
      if (!seen.has(marker.label)) { seen.add(marker.label); firstFour.push(marker); }
      if (firstFour.length === 4) break;
    }
    if (firstFour.length !== 4) {
      skipped.push({ external_id, reason: `found only ${firstFour.length} choices` });
      continue;
    }

    const choiceTexts = firstFour.map((m, idx) => {
      const start = m.index + m.label.length + 2;
      const end = idx + 1 < firstFour.length ? firstFour[idx + 1].index : choicesRaw.length;
      return choicesRaw.substring(start, end).replace(/\s+/g, ' ').trim();
    });

    // Correct answer
    const answerMatch = block.match(/Correct Answer:\s*([A-D])/i);
    if (!answerMatch) {
      skipped.push({ external_id, reason: 'could not find correct answer' });
      continue;
    }

    // Rationale — everything after "Rationale\n" to end of block
    const rationaleMatch = block.match(/\nRationale\n([\s\S]*?)$/i);
    const rationale = rationaleMatch ? rationaleMatch[1].replace(/\s+/g, ' ').trim() : '';

    questions.push({
      external_id,
      category,
      skill,
      difficulty,
      question,
      choice_a: choiceTexts[0],
      choice_b: choiceTexts[1],
      choice_c: choiceTexts[2],
      choice_d: choiceTexts[3],
      correct_answer: answerMatch[1].toUpperCase(),
      rationale,
      page_number: pageNumber,
    });
  }

  return { questions, skipped };
}
