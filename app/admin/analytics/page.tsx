import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllStudents } from '@/lib/db';
import AnalyticsDashboardClient from './client';

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') {
    redirect('/login');
  }

  const students = (await getAllStudents()) as { id: string; name: string }[];

  return <AnalyticsDashboardClient students={students} />;
}
