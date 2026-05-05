import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { upsertWorksheetStepPosition, deleteWorksheetStepPosition } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
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
  const position = await upsertWorksheetStepPosition(stepId, questionNumber, pageNumber, xPercent, yPercent);
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
