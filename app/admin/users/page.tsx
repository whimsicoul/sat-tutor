import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllUsers } from '@/lib/db';
import UsersClient from './client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export default async function AdminUsersPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const users = await getAllUsers();
  return <UsersClient users={users as AdminUser[]} />;
}
