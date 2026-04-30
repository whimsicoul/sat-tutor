import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getActBubblePositions, upsertActBubble, deleteActBubble } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'admin') return null;
  return session;
}

export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section') ?? 'english';
  const bubbles = await getActBubblePositions(section);
  return NextResponse.json(bubbles);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { section, pageNumber, questionNumber, choice, xPercent, yPercent } = await req.json();
  const bubble = await upsertActBubble(section, pageNumber, questionNumber, choice, xPercent, yPercent);
  return NextResponse.json({ ok: true, bubble });
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await deleteActBubble(id);
  return NextResponse.json({ ok: true });
}
