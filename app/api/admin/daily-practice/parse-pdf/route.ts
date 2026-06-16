import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

function clean(s: string) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\f/g, '\n');
}

function parseQuestionBankText(raw: string) {
  const normalised = clean(raw);
  const blocks = normalised.split(/(?=Question ID [a-f0-9]+\b)/i).filter((b) => b.trim());

  const rows: {
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
  }[] = [];

  const skipped: { external_id: string; reason: string }[] = [];

  for (const block of blocks) {
    const idMatch = block.match(/Question ID ([a-f0-9]+)/i);
    const externalId = idMatch?.[1] ?? '';

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

    // Body between second "ID: <hex>" and answer section
    const bodyMatch = block.match(/\nID:\s*[a-f0-9]+\n([\s\S]*?)\nID:\s*[a-f0-9]+\s*Answer/i);
    if (!bodyMatch) {
      skipped.push({ external_id: externalId, reason: 'could not isolate question body' });
      continue;
    }
    const body = bodyMatch[1];

    // Find where choice A starts
    const choiceStartMatch = body.match(/(?:^|\n|\?\s*)(A\.)\s/);
    if (!choiceStartMatch) {
      skipped.push({ external_id: externalId, reason: 'could not find choice A' });
      continue;
    }
    const choiceStartIdx = body.indexOf(choiceStartMatch[1]);
    const questionText = body.substring(0, choiceStartIdx).replace(/\s+/g, ' ').trim();
    const choicesRaw = body.substring(choiceStartIdx).trim();

    // Find A B C D marker positions
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
      skipped.push({ external_id: externalId, reason: `found only ${firstFour.length} choices` });
      continue;
    }

    const choiceTexts = firstFour.map((m, i) => {
      const start = m.index + m.label.length + 2;
      const end = i + 1 < firstFour.length ? firstFour[i + 1].index : choicesRaw.length;
      return choicesRaw.substring(start, end).replace(/\s+/g, ' ').trim();
    });

    const answerMatch = block.match(/Correct Answer:\s*([A-D])/i);
    if (!answerMatch) {
      skipped.push({ external_id: externalId, reason: 'could not find correct answer' });
      continue;
    }

    rows.push({
      external_id: externalId,
      category,
      skill,
      difficulty,
      question: questionText,
      choice_a: choiceTexts[0],
      choice_b: choiceTexts[1],
      choice_c: choiceTexts[2],
      choice_d: choiceTexts[3],
      correct_answer: answerMatch[1].toUpperCase(),
    });
  }

  return { rows, skipped };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }

  // Write PDF to a temp file so pdftotext can process it
  const tmpPath = join(tmpdir(), `qbank-${randomUUID()}.pdf`);
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    writeFileSync(tmpPath, buf);

    let rawText: string;
    try {
      rawText = execSync(`pdftotext "${tmpPath}" -`, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 60_000,
      });
    } catch {
      return NextResponse.json(
        { error: 'PDF text extraction failed. Make sure the PDF contains selectable text.' },
        { status: 422 }
      );
    }

    const { rows, skipped } = parseQuestionBankText(rawText);
    return NextResponse.json({ rows, skipped, total_found: rows.length + skipped.length });
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}
