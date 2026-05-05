import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getWorksheetById,
  getWorksheetSteps,
  getWorksheetStepPages,
  getWorksheetStepPositions,
  getWorksheetStepAnswerKey,
  deleteWorksheet,
} from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') return false;
  return true;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const worksheet = await getWorksheetById(id);
  if (!worksheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const steps = await getWorksheetSteps(id);
  const stepsWithData = await Promise.all(
    (steps as { id: string }[]).map(async (step) => {
      const [pages, positions, answerKey] = await Promise.all([
        getWorksheetStepPages(step.id),
        getWorksheetStepPositions(step.id),
        getWorksheetStepAnswerKey(step.id),
      ]);
      return { ...step, pages, positions, answerKey };
    }),
  );
  return NextResponse.json({ worksheet, steps: stepsWithData });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await deleteWorksheet(id);
  return NextResponse.json({ ok: true });
}
