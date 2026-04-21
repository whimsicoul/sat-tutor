import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const rows = await sql`SELECT * FROM testimonials ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { authorName, content, rating } = await req.json();
  if (!authorName || !content || !rating) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO testimonials (author_name, content, rating)
    VALUES (${authorName}, ${content}, ${rating})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
