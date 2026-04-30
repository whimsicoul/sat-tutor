import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getActPages, upsertActPage, deleteActPageById } from '@/lib/db';

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
  const pages = await getActPages(section);
  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { section, pageNumber, imageUrl } = await req.json();
  const page = await upsertActPage(section, pageNumber, imageUrl);
  return NextResponse.json({ ok: true, page });
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await deleteActPageById(id);
  return NextResponse.json({ ok: true });
}
