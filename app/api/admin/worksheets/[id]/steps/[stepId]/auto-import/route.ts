import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { UTApi } from 'uploadthing/server';
import { parseQuestionBankPdf } from '@/lib/pdf-parser';
import {
  insertWorksheetStepProblem,
  updateWorksheetStepProblemAnswerKey,
  upsertWorksheetStepPosition,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

const utapi = new UTApi();
// 150dpi render scale — matches the ACT conversion script
const RENDER_SCALE = 150 / 72;

interface PdfTextItem {
  str: string;
  transform: number[]; // [a, b, c, d, e, f] — e=x, f=y in PDF points
  width: number;
  height: number;
}

async function getPageTextItems(pdfData: Uint8Array, pageNum: number): Promise<PdfTextItem[]> {
  // Dynamic import so Next.js doesn't try to bundle this for the browser
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Disable worker — we're on the server
  pdfjs.GlobalWorkerOptions.workerSrc = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await pdfjs.getDocument({ data: pdfData, useWorkerFetch: false } as any).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  // PDF y-axis is bottom-up; viewport.height lets us flip to top-down
  return (content.items as PdfTextItem[]).map((item) => ({
    ...item,
    // Remap f (y in PDF space) to top-down: flipped_y = pageHeight - f
    transform: [
      item.transform[0],
      item.transform[1],
      item.transform[2],
      item.transform[3],
      item.transform[4], // x
      viewport.height - item.transform[5], // y, now top-down
    ],
  }));
}

function findTextY(items: PdfTextItem[], pattern: RegExp): number | null {
  const match = items.find((it) => pattern.test(it.str));
  return match ? match.transform[5] : null;
}

function findChoicePositions(
  items: PdfTextItem[],
  pageWidth: number,
  pageHeight: number,
): Record<string, { xPercent: number; yPercent: number }> {
  const result: Record<string, { xPercent: number; yPercent: number }> = {};
  const seen = new Set<string>();
  for (const item of items) {
    const m = item.str.match(/^([A-D])\.?$/);
    if (!m) continue;
    const letter = m[1];
    if (seen.has(letter)) continue;
    seen.add(letter);
    result[letter] = {
      xPercent: (item.transform[4] / pageWidth) * 100,
      yPercent: (item.transform[5] / pageHeight) * 100,
    };
    if (Object.keys(result).length === 4) break;
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPagePng(doc: any, pageIndex: number): Promise<Buffer> {
  const mupdf = (await import('mupdf')).default;
  const page = doc.loadPage(pageIndex);
  const matrix = mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE);
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
  return Buffer.from(pixmap.asPNG());
}

async function cropAndUpload(
  pngBuf: Buffer,
  pageWidthPts: number,
  pageHeightPts: number,
  topYPts: number,
  bottomYPts: number,
  filename: string,
): Promise<string> {
  // Coordinates are in PDF-point top-down space; convert to pixel space
  const scale = RENDER_SCALE;
  const imgWidth = Math.round(pageWidthPts * scale);
  const imgHeight = Math.round(pageHeightPts * scale);
  const cropTop = Math.max(0, Math.round(topYPts * scale));
  const cropBottom = Math.min(imgHeight, Math.round(bottomYPts * scale));
  const cropH = cropBottom - cropTop;

  if (cropH <= 0) throw new Error(`Invalid crop bounds: top=${cropTop} bottom=${cropBottom}`);

  // Use sharp (devDependency already installed) to crop
  const sharp = (await import('sharp')).default;
  const cropped = await sharp(pngBuf)
    .extract({ left: 0, top: cropTop, width: imgWidth, height: cropH })
    .png()
    .toBuffer();

  const file = new File([new Uint8Array(cropped)], filename, { type: 'image/png' });
  const response = await utapi.uploadFiles(file);
  if (response.error) throw new Error(response.error.message);
  return response.data.ufsUrl;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { stepId } = await params;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }

  const pdfBuf = Buffer.from(await file.arrayBuffer());
  const pdfData = new Uint8Array(pdfBuf);
  const tmpPath = join(tmpdir(), `auto-import-${randomUUID()}.pdf`);

  try {
    writeFileSync(tmpPath, pdfBuf);

    // 1. Text extraction for metadata + correct answers
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
        { status: 422 },
      );
    }

    const { questions, skipped } = parseQuestionBankPdf(rawText);
    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions found in PDF', skipped }, { status: 422 });
    }

    // 2. Render all pages via mupdf
    const mupdf = (await import('mupdf')).default;
    const mupdfDoc = mupdf.Document.openDocument(pdfBuf, 'application/pdf');
    const pageCount = mupdfDoc.countPages();

    // 3. Get page dimensions from pdfjs (used for coordinate math)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsDoc = await pdfjs.getDocument({ data: pdfData, useWorkerFetch: false } as any).promise;

    const imported: {
      question_number: number;
      external_id: string;
      correct_answer: string;
      question_image_url: string;
      explanation_image_url: string | null;
      bubble_positions: Record<string, { xPercent: number; yPercent: number }>;
    }[] = [];
    const failedPages: { page: number; external_id: string; reason: string }[] = [];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const pageIndex = q.page_number - 1; // 0-based for mupdf

      if (pageIndex >= pageCount) {
        failedPages.push({ page: q.page_number, external_id: q.external_id, reason: 'page out of range' });
        continue;
      }

      try {
        const pdfjsPage = await pdfjsDoc.getPage(q.page_number);
        const viewport = pdfjsPage.getViewport({ scale: 1 });
        const pageWidthPts = viewport.width;
        const pageHeightPts = viewport.height;

        // Get text items with top-down y coords
        const textItems = await getPageTextItems(pdfData, q.page_number);

        // Find the y-position of "Correct Answer:" — question image ends just above this
        const correctAnswerY = findTextY(textItems, /^Correct Answer:/i)
          ?? findTextY(textItems, /^Correct Answer$/i)
          ?? findTextY(textItems, /^Correct/i);

        // Question image: from page top (0) to just above "Correct Answer:" line
        // If we can't find it, crop the top 60% of the page as fallback
        const questionBottomY = correctAnswerY !== null
          ? Math.max(0, correctAnswerY - 8)
          : pageHeightPts * 0.6;

        // Rationale image: from "Rationale" heading to page bottom
        const rationaleY = findTextY(textItems, /^Rationale$/i);

        // Render the page
        const pagePng = await renderPagePng(mupdfDoc, pageIndex);

        // Crop question image (top of page → above "Correct Answer:")
        const questionImageUrl = await cropAndUpload(
          pagePng,
          pageWidthPts,
          pageHeightPts,
          0,
          questionBottomY,
          `q-${q.external_id}-question.png`,
        );

        // Crop rationale image if we found the "Rationale" heading
        let explanationImageUrl: string | null = null;
        if (rationaleY !== null) {
          try {
            explanationImageUrl = await cropAndUpload(
              pagePng,
              pageWidthPts,
              pageHeightPts,
              rationaleY + 2,
              pageHeightPts,
              `q-${q.external_id}-rationale.png`,
            );
          } catch {
            // non-fatal — rationale crop failure just means no explanation image
          }
        }

        // Find A/B/C/D bubble positions from text coordinates
        const bubblePositions = findChoicePositions(textItems, pageWidthPts, pageHeightPts);

        imported.push({
          question_number: qi + 1,
          external_id: q.external_id,
          correct_answer: q.correct_answer,
          question_image_url: questionImageUrl,
          explanation_image_url: explanationImageUrl,
          bubble_positions: bubblePositions,
        });
      } catch (err) {
        failedPages.push({
          page: q.page_number,
          external_id: q.external_id,
          reason: err instanceof Error ? err.message : 'unknown error',
        });
      }
    }

    // 4. Write to DB
    const letterMap: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
    for (const item of imported) {
      // Insert problem row
      await insertWorksheetStepProblem(stepId, item.question_number, item.question_image_url);

      // Set correct answer + explanation
      await updateWorksheetStepProblemAnswerKey(
        stepId,
        item.question_number,
        item.correct_answer,
        item.explanation_image_url,
        'multiple_choice',
        [],
      );

      // Insert bubble positions
      for (const [letter, pos] of Object.entries(item.bubble_positions)) {
        const encodedQNum = item.question_number * 10 + (letterMap[letter] ?? 0);
        await upsertWorksheetStepPosition(
          stepId,
          encodedQNum,
          item.question_number,
          pos.xPercent,
          pos.yPercent,
        );
      }
    }

    return NextResponse.json({
      imported: imported.length,
      skipped_parse: skipped,
      failed_pages: failedPages,
    });
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}
