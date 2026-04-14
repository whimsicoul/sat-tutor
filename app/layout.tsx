import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import SessionProvider from '@/components/shared/SessionProvider';

export const metadata: Metadata = {
  title: 'DC SAT Tutor',
  description: 'Personalized SAT tutoring — problem sets, scheduling, and results.',
};

export const viewport = {
  themeColor: '#1F1F1F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
