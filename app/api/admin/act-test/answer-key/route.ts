import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getActAnswerKey, bulkUpsertActAnswerKey } from '@/lib/db';

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
  const key = await getActAnswerKey(section);
  return NextResponse.json(key);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Accepts: { entries: [{ section, question_number, correct_answer }] }
  const { entries } = await req.json() as {
    entries: { section: string; question_number: number; correct_answer: string }[];
  };
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
  }
  await bulkUpsertActAnswerKey(entries);
  return NextResponse.json({ ok: true, count: entries.length });
}
