'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Layers, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { TutorWorksheetRow, TutorStudentRow } from './page';

export default function TutorWorksheetsClient({
  worksheets,
  students,
}: {
  worksheets: TutorWorksheetRow[];
  students: TutorStudentRow[];
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState<TutorWorksheetRow | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [saving, setSaving] = useState(false);

  function openAssign(w: TutorWorksheetRow) {
    setSelectedWorksheet(w);
    setSelectedStudentId(students[0]?.id ?? '');
    setAssignOpen(true);
  }

  async function handleAssign() {
    if (!selectedWorksheet || !selectedStudentId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tutor/worksheets/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetId: selectedWorksheet.id, studentId: selectedStudentId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Worksheet assigned — student can now access it');
      setAssignOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error assigning worksheet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Syne', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: 'var(--charcoal)', margin: 0, letterSpacing: '-0.025em' }}>
          Worksheets
        </h1>
        <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15 }}>
          All available worksheets — assign them to your students
        </p>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--fog)', boxShadow: '0 2px 8px rgba(26,29,35,0.04)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--fog)', background: 'var(--frost)' }}>
              {['Title', 'Creator', 'Steps', 'Created', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worksheets.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--mist)', fontSize: 14 }}>
                  <Layers size={32} style={{ marginBottom: 12, opacity: 0.4, display: 'block', margin: '0 auto 12px' }} />
                  No worksheets yet. Contact your admin to create worksheets.
                </td>
              </tr>
            ) : (
              worksheets.map((w, i) => (
                <tr
                  key={w.id}
                  style={{ borderBottom: i < worksheets.length - 1 ? '1px solid var(--fog)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--frost)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{w.title}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--slate)' }}>{w.created_by_name}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--sky-deeper)', background: 'rgba(168,203,222,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(168,203,222,0.3)' }}>
                      <Layers size={12} /> {w.step_count} {w.step_count === 1 ? 'step' : 'steps'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--mist)' }}>
                    {format(new Date(w.created_at), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <button
                      onClick={() => openAssign(w)}
                      disabled={students.length === 0}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--rose-deeper)', background: 'rgba(224,166,175,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(224,166,175,0.3)', cursor: students.length === 0 ? 'not-allowed' : 'pointer', opacity: students.length === 0 ? 0.5 : 1 }}
                    >
                      <UserPlus size={12} /> Assign
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={assignOpen} onOpenChange={(o) => { if (!o) setAssignOpen(false); }}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              Assign Worksheet
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <p style={{ fontSize: 14, color: 'var(--slate)', margin: '0 0 16px' }}>
                <strong style={{ color: 'var(--charcoal)' }}>{selectedWorksheet?.title}</strong> will be assigned to the selected student. A new session will be created immediately.
              </p>
            </div>
            <div>
              <Label htmlFor="assign-student">Student</Label>
              <select
                id="assign-student"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--fog)', fontSize: 14, color: 'var(--charcoal)', background: 'var(--white)', fontFamily: "'Syne', sans-serif" }}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={saving || !selectedStudentId} style={{ background: 'var(--rose)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}>
              {saving ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
