import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllWorksheets, createWorksheet } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') return null;
  return session!.user as { id: string };
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const worksheets = await getAllWorksheets();
  return NextResponse.json({ worksheets });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title } = await req.json() as { title: string };
  if (!title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const worksheet = await createWorksheet(title, user.id);
  return NextResponse.json({ worksheet }, { status: 201 });
}
