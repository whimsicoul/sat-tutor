import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = session.user.id;

  if (role === 'student') {
    const rows = await sql`
      SELECT ps.id, ps.title, ps.problem_pdf_url, ps.created_at,
             u.name AS tutor_name
      FROM problem_sets ps
      JOIN users u ON u.id = ps.tutor_id
      WHERE ps.student_id = ${userId}
      ORDER BY ps.created_at DESC
    `;
    return NextResponse.json(rows);
  }

  if (role === 'tutor') {
    const rows = await sql`
      SELECT ps.id, ps.title, ps.problem_pdf_url, ps.answer_pdf_url, ps.created_at,
             u.name AS student_name
      FROM problem_sets ps
      JOIN users u ON u.id = ps.student_id
      WHERE ps.tutor_id = ${userId}
      ORDER BY ps.created_at DESC
    `;
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, studentId, problemPdfUrl, answerPdfUrl } = body;

  if (!title || !studentId || !problemPdfUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO problem_sets (title, student_id, tutor_id, problem_pdf_url, answer_pdf_url)
    VALUES (${title}, ${studentId}, ${session.user.id}, ${problemPdfUrl}, ${answerPdfUrl ?? null})
    RETURNING *
  `;

  // Fire extraction jobs in the background (non-blocking)
  const origin = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const headers = { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') ?? '' };

  fetch(`${origin}/api/problem-sets/extract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ problemSetId: row.id, pdfUrl: problemPdfUrl, type: 'questions' }),
  }).catch(() => {/* extraction errors are tracked in DB status column */});

  if (answerPdfUrl) {
    fetch(`${origin}/api/problem-sets/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ problemSetId: row.id, pdfUrl: answerPdfUrl, type: 'answers' }),
    }).catch(() => {/* extraction errors are tracked in DB status column */});
  }

  return NextResponse.json(row, { status: 201 });
}
