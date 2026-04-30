import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getActPages, getActBubblePositions, getActAnswerKey } from '@/lib/db';
import AdminActTestClient from './client';

export interface ActPage {
  id: string;
  section: string;
  page_number: number;
  image_url: string;
}

export interface ActBubble {
  id: string;
  section: string;
  page_number: number;
  question_number: number;
  choice: string;
  x_percent: number;
  y_percent: number;
}

export interface ActAnswerKeyEntry {
  section: string;
  question_number: number;
  correct_answer: string;
}

export default async function AdminActTestPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const [englishPages, mathPages, readingPages, sciencePages] = await Promise.all([
    getActPages('english'),
    getActPages('math'),
    getActPages('reading'),
    getActPages('science'),
  ]);

  const [englishBubbles, mathBubbles, readingBubbles, scienceBubbles] = await Promise.all([
    getActBubblePositions('english'),
    getActBubblePositions('math'),
    getActBubblePositions('reading'),
    getActBubblePositions('science'),
  ]);

  const [englishKey, mathKey, readingKey, scienceKey] = await Promise.all([
    getActAnswerKey('english'),
    getActAnswerKey('math'),
    getActAnswerKey('reading'),
    getActAnswerKey('science'),
  ]);

  const allPages = [...englishPages, ...mathPages, ...readingPages, ...sciencePages];
  const allBubbles = [...englishBubbles, ...mathBubbles, ...readingBubbles, ...scienceBubbles];
  const allAnswerKey = [...englishKey, ...mathKey, ...readingKey, ...scienceKey];

  return (
    <AdminActTestClient
      initialPages={allPages as unknown as ActPage[]}
      initialBubbles={allBubbles as unknown as ActBubble[]}
      initialAnswerKey={allAnswerKey as unknown as ActAnswerKeyEntry[]}
    />
  );
}
