import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProblemSetPages, upsertProblemSetPage, deleteProblemSetPage } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const pages = await getProblemSetPages(id);
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json() as { pageNumber: number; imageUrl: string };
  if (!body.pageNumber || !body.imageUrl) {
    return NextResponse.json({ error: 'Missing pageNumber or imageUrl' }, { status: 400 });
  }

  const page = await upsertProblemSetPage(id, body.pageNumber, body.imageUrl);
  return NextResponse.json({ page }, { status: 201 });
}

export async function DELETE(req: NextRequest, _ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json() as { pageId: string };
  if (!body.pageId) return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
  await deleteProblemSetPage(body.pageId);
  return NextResponse.json({ ok: true });
}
