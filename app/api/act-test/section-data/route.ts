import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getActPages, getActBubblePositions } from '@/lib/db';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section');
  if (!section) return NextResponse.json({ error: 'section required' }, { status: 400 });

  const [pages, bubbles] = await Promise.all([
    getActPages(section),
    getActBubblePositions(section),
  ]);

  return NextResponse.json({ pages, bubbles });
}
