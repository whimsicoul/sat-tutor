import { createEvent } from 'ics';

export function generateICS(session: {
  title: string;
  start: Date;
  durationMinutes: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = session.start;
    createEvent(
      {
        title: session.title,
        start: [s.getFullYear(), s.getMonth() + 1, s.getDate(), s.getHours(), s.getMinutes()],
        duration: { minutes: session.durationMinutes },
      },
      (error, value) => {
        if (error) reject(error);
        else resolve(value);
      }
    );
  });
}

export function getGoogleCalendarUrl(session: {
  title: string;
  start: Date;
  durationMinutes: number;
}): string {
  const end = new Date(session.start.getTime() + session.durationMinutes * 60_000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${fmt(session.start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
