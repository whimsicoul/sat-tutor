import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSessionById,
  getProblemSetsForSessionPair,
  getProblemSetsBySession,
  setSessionProblemSets,
} from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session) return null;
  if ((session.user as { role?: string }).role !== 'admin') return null;
  return session;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const sessionRow = await getSessionById(id);
  if (!sessionRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [availableProblemSets, attachedRows] = await Promise.all([
    getProblemSetsForSessionPair(sessionRow.tutor_id as string, sessionRow.student_id as string),
    getProblemSetsBySession(id),
  ]);

  const attachedProblemSetIds = (attachedRows as { id: string }[]).map((r) => r.id);

  return NextResponse.json({ availableProblemSets, attachedProblemSetIds });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const sessionRow = await getSessionById(id);
  if (!sessionRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { problemSetIds } = body as { problemSetIds: string[] };
  if (!Array.isArray(problemSetIds)) {
    return NextResponse.json({ error: 'problemSetIds must be an array' }, { status: 400 });
  }

  // Validate all ids belong to this tutor-student pair
  const available = (await getProblemSetsForSessionPair(
    sessionRow.tutor_id as string,
    sessionRow.student_id as string
  )) as { id: string }[];
  const validIds = new Set(available.map((r) => r.id));
  const safeIds = problemSetIds.filter((psId) => validIds.has(psId));

  await setSessionProblemSets(id, safeIds);
  return NextResponse.json({ ok: true });
}
