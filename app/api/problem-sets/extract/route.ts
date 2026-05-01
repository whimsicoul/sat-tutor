import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import {
  updateProblemSetExtractionStatus,
  updateProblemSetAnswerKeyStatus,
  bulkInsertProblemSetQuestions,
  bulkInsertProblemSetAnswerKey,
  type ExtractedQuestion,
  type ExtractedAnswer,
} from '@/lib/db';

const client = new Anthropic();

const QUESTION_EXTRACTION_PROMPT = `You are extracting SAT/ACT multiple-choice questions from a PDF.
Return ONLY valid JSON with this exact shape — no explanation, no markdown, no code fences:
{
  "questions": [
    {
      "number": 1,
      "passage": "Optional shared reading passage text (omit key if no passage)",
      "stem": "The question text here",
      "choices": { "A": "...", "B": "...", "C": "...", "D": "..." }
    }
  ]
}
Rules:
- Include every multiple-choice question in the document.
- question number must be a positive integer matching the number printed next to the question.
- passage should contain any shared reading passage for a group of questions. If multiple questions share a passage, include the passage text on the first question in the group only.
- stem is the question text only (not the choices).
- choices must always have exactly A, B, C, D keys.
- If a question references a graph, chart, or figure you cannot reproduce, describe it briefly in brackets, e.g. "[Graph showing linear growth from 0 to 100 over 5 years]".
- Output ONLY the JSON object. Nothing else.`;

const ANSWER_KEY_EXTRACTION_PROMPT = `You are extracting an answer key from a PDF.
Return ONLY valid JSON with this exact shape — no explanation, no markdown, no code fences:
{ "answers": [{ "number": 1, "answer": "A" }, { "number": 2, "answer": "C" }] }
Rules:
- number is the question number as a positive integer.
- answer is one of: A, B, C, D (uppercase).
- Include every answer in the document.
- Output ONLY the JSON object. Nothing else.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== 'tutor' && role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { problemSetId: string; pdfUrl: string; type: 'questions' | 'answers' };
  const { problemSetId, pdfUrl, type } = body;

  if (!problemSetId || !pdfUrl || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Mark as processing immediately
  if (type === 'questions') {
    await updateProblemSetExtractionStatus(problemSetId, 'processing');
  } else {
    await updateProblemSetAnswerKeyStatus(problemSetId, 'processing');
  }

  try {
    // Fetch the PDF bytes from UploadThing CDN
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) throw new Error(`Failed to fetch PDF: ${pdfRes.status}`);
    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    const prompt = type === 'questions' ? QUESTION_EXTRACTION_PROMPT : ANSWER_KEY_EXTRACTION_PROMPT;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: prompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: type === 'questions'
                ? 'Extract all multiple-choice questions from this PDF.'
                : 'Extract the answer key from this PDF.',
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Strip any accidental markdown fences
    const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(jsonText) as
      | { questions: ExtractedQuestion[] }
      | { answers: ExtractedAnswer[] };

    if (type === 'questions' && 'questions' in parsed) {
      await bulkInsertProblemSetQuestions(problemSetId, parsed.questions);
      await updateProblemSetExtractionStatus(problemSetId, 'done', parsed.questions.length);
    } else if (type === 'answers' && 'answers' in parsed) {
      await bulkInsertProblemSetAnswerKey(problemSetId, parsed.answers);
      await updateProblemSetAnswerKeyStatus(problemSetId, 'done');
    } else {
      throw new Error('Unexpected response shape from Claude');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[extract]', err);
    if (type === 'questions') {
      await updateProblemSetExtractionStatus(problemSetId, 'failed');
    } else {
      await updateProblemSetAnswerKeyStatus(problemSetId, 'failed');
    }
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
