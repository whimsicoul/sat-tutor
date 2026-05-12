import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorksheetStepPositions, upsertWorksheetStepPosition, deleteWorksheetStepPosition } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const raw = await getWorksheetStepPositions(stepId);
  const positions = raw.map((p) => ({ ...p, x_percent: Number(p.x_percent), y_percent: Number(p.y_percent) }));
  return NextResponse.json({ positions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const { questionNumber, pageNumber, xPercent, yPercent } = await req.json() as {
    questionNumber: number;
    pageNumber: number;
    xPercent: number;
    yPercent: number;
  };
  const raw = await upsertWorksheetStepPosition(stepId, questionNumber, pageNumber, xPercent, yPercent);
  const position = { ...raw, x_percent: Number(raw.x_percent), y_percent: Number(raw.y_percent) };
  return NextResponse.json({ position }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _routeContext: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { positionId } = await req.json() as { positionId: string };
  await deleteWorksheetStepPosition(positionId);
  return NextResponse.json({ ok: true });
}
