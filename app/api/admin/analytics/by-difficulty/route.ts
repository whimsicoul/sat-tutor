import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAnalyticsByDifficulty, type AnalyticsFilters } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const filters: AnalyticsFilters = {
    source: (searchParams.get('source') ?? 'all') as AnalyticsFilters['source'],
    studentId: searchParams.get('student_id') || null,
    category: searchParams.get('category') || null,
    dateStart: searchParams.get('date_start') || null,
    dateEnd: searchParams.get('date_end') || null,
  };

  const difficulties = await getAnalyticsByDifficulty(filters);
  return NextResponse.json({ difficulties });
}
