import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createWorksheetStep, getWorksheetSteps, reorderWorksheetSteps } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: worksheetId } = await params;
  const { title, type, stageLabel, lockedNav, pdfUrl } = await req.json() as {
    title: string;
    type: 'instruction' | 'problems';
    stageLabel?: string;
    lockedNav?: boolean;
    pdfUrl?: string;
  };
  const existing = await getWorksheetSteps(worksheetId);
  const stepOrder = (existing as unknown[]).length + 1;
  const step = await createWorksheetStep(
    worksheetId,
    stepOrder,
    title,
    type,
    stageLabel ?? null,
    lockedNav ?? false,
    pdfUrl ?? null,
  );
  return NextResponse.json({ step }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: worksheetId } = await params;
  const { orderedStepIds } = await req.json() as { orderedStepIds: string[] };
  await reorderWorksheetSteps(worksheetId, orderedStepIds);
  return NextResponse.json({ ok: true });
}
