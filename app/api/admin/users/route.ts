import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllUsers, createUser } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['student', 'tutor'].includes(role)) {
    return NextResponse.json({ error: 'Role must be student or tutor' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await createUser(name, email, hashed, role);
  return NextResponse.json(user, { status: 201 });
}
