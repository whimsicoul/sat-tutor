'use client';

import { Layers } from 'lucide-react';
import type { TutorWorksheetRow } from './page';

export default function TutorWorksheetsClient({
  worksheets,
}: {
  worksheets: TutorWorksheetRow[];
}) {
  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Syne', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: 'var(--charcoal)', margin: 0, letterSpacing: '-0.025em' }}>
          Worksheets
        </h1>
        <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15 }}>
          Worksheets you have created — assign them to sessions via the Schedule page
        </p>
      </div>

      {worksheets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 0',
          color: 'var(--mist)',
          fontSize: 14,
        }}>
          <Layers size={32} style={{ marginBottom: 12, opacity: 0.4, display: 'block', margin: '0 auto 12px' }} />
          No worksheets yet. Contact your admin to create worksheets.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {worksheets.map((w) => (
            <div
              key={w.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                background: 'var(--white)',
                border: '1px solid var(--fog)',
                borderRadius: 10,
              }}
            >
              <Layers size={16} style={{ color: 'var(--sky-deeper)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>
                {w.title}
              </span>
              <span style={{ fontSize: 12, color: 'var(--mist)' }}>
                Assign via Schedule
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
