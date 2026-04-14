import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'tutor') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar role="tutor" userName={session.user.name ?? 'Tutor'} />
      <main className="max-w-5xl mx-auto px-5 py-10">{children}</main>
    </div>
  );
}
