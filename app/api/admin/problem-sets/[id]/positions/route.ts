import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProblemSetQuestionPositions,
  upsertProblemSetQuestionPosition,
  deleteProblemSetQuestionPosition,
} from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const positions = await getProblemSetQuestionPositions(id);
  return NextResponse.json({ positions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json() as {
    questionNumber: number;
    pageNumber: number;
    xPercent: number;
    yPercent: number;
  };

  if (!body.questionNumber || !body.pageNumber || body.xPercent == null || body.yPercent == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const position = await upsertProblemSetQuestionPosition(
    id, body.questionNumber, body.pageNumber, body.xPercent, body.yPercent
  );
  return NextResponse.json({ position });
}

export async function DELETE(req: NextRequest, _ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json() as { positionId: string };
  if (!body.positionId) return NextResponse.json({ error: 'Missing positionId' }, { status: 400 });
  await deleteProblemSetQuestionPosition(body.positionId);
  return NextResponse.json({ ok: true });
}
