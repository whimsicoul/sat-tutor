import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import {
  getActResultsForStudent,
  getActResultsForTutorStudents,
  getAllActResults,
} from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;

  if (role === 'admin') {
    const results = await getAllActResults();
    return NextResponse.json(results);
  }

  if (role === 'tutor') {
    const results = await getActResultsForTutorStudents(userId);
    return NextResponse.json(results);
  }

  // student
  const results = await getActResultsForStudent(userId);
  return NextResponse.json(results);
}
