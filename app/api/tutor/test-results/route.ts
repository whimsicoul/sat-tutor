import { auth } from '@/lib/auth';
import { getTestResultsForTutorStudents } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await getTestResultsForTutorStudents(session.user.id);
  return NextResponse.json(results);
}
