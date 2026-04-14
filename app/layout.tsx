import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import SessionProvider from '@/components/shared/SessionProvider';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'DC SAT Tutor',
  description: 'Personalized SAT tutoring — problem sets, scheduling, and results.',
};

export const viewport = {
  themeColor: '#12192C',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
