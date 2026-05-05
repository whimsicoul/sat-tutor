import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateWorksheetStep, deleteWorksheetStep } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const body = await req.json() as {
    title?: string;
    stageLabel?: string | null;
    lockedNav?: boolean;
    pdfUrl?: string | null;
    stepOrder?: number;
  };
  const step = await updateWorksheetStep(stepId, {
    title: body.title,
    stageLabel: body.stageLabel,
    lockedNav: body.lockedNav,
    pdfUrl: body.pdfUrl,
    stepOrder: body.stepOrder,
  });
  return NextResponse.json({ step });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  await deleteWorksheetStep(stepId);
  return NextResponse.json({ ok: true });
}
