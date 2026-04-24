import { auth } from '@/lib/auth';
import { getAllSatDates, createSatDate } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dates = await getAllSatDates();
  return NextResponse.json(dates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studentId, testDate } = await req.json();
  if (!studentId || !testDate) {
    return NextResponse.json({ error: 'studentId and testDate are required' }, { status: 400 });
  }

  const row = await createSatDate(studentId, testDate, session.user.id);
  return NextResponse.json(row, { status: 201 });
}
