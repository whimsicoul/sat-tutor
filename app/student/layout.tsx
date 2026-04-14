import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'student') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar role="student" userName={session.user.name ?? 'Student'} />
      <main className="max-w-4xl mx-auto px-5 py-10">{children}</main>
    </div>
  );
}
