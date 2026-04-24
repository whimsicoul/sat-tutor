import { auth } from '@/lib/auth';
import { getSatDatesByStudent, createSatDate } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dates = await getSatDatesByStudent(session.user.id);
  return NextResponse.json(dates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { testDate } = await req.json();
  if (!testDate) {
    return NextResponse.json({ error: 'testDate is required' }, { status: 400 });
  }

  const row = await createSatDate(session.user.id, testDate, session.user.id);
  return NextResponse.json(row, { status: 201 });
}
