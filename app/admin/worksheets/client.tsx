'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Pencil, Layers, UserPlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminWorksheet } from './page';

interface StudentOption { id: string; name: string; }

export default function WorksheetsClient({
  worksheets: initial,
}: {
  worksheets: AdminWorksheet[];
}) {
  const [worksheets, setWorksheets] = useState<AdminWorksheet[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '' });

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState<AdminWorksheet | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    if (!assignOpen) return;
    setStudentsLoading(true);
    fetch('/api/admin/users?role=student')
      .then((r) => r.json())
      .then((data: StudentOption[]) => {
        setStudents(data);
        setSelectedStudentId(data[0]?.id ?? '');
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setStudentsLoading(false));
  }, [assignOpen]);

  function resetForm() {
    setForm({ title: '' });
  }

  async function handleCreate() {
    if (!form.title) {
      toast.error('Please enter a title');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const { worksheet } = await res.json() as { worksheet: { id: string; title: string; created_at: string } };
      const created: AdminWorksheet = {
        id: worksheet.id,
        title: worksheet.title,
        created_by_name: 'You',
        step_count: 0,
        created_at: worksheet.created_at,
      };
      setWorksheets((prev) => [created, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success('Worksheet created — now add steps in the builder');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error creating worksheet');
    } finally {
      setSaving(false);
    }
  }

  function openAssign(w: AdminWorksheet) {
    setSelectedWorksheet(w);
    setAssignOpen(true);
  }

  async function handleAssign() {
    if (!selectedWorksheet || !selectedStudentId) return;
    setAssignSaving(true);
    try {
      const res = await fetch('/api/admin/worksheets/assign', {
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
      setAssignSaving(false);
    }
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: 'var(--charcoal)', margin: 0, letterSpacing: '-0.025em' }}>
            Worksheets
          </h1>
          <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15 }}>
            Build sequential, multi-step assignments for students
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="btn-rose"
          style={{ gap: 8 }}
        >
          <Plus size={16} /> New Worksheet
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--fog)', boxShadow: '0 2px 8px rgba(26,29,35,0.04)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--fog)', background: 'var(--frost)' }}>
              {['Title', 'Steps', 'Created', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worksheets.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 48, color: 'var(--mist)', fontSize: 14 }}>
                  No worksheets yet — create one to get started
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
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--sky-deeper)', background: 'rgba(168,203,222,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(168,203,222,0.3)' }}>
                      <Layers size={12} /> {w.step_count} {Number(w.step_count) === 1 ? 'step' : 'steps'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--mist)' }}>
                    {format(new Date(w.created_at), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '14px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Link
                      href={`/admin/worksheets/${w.id}/edit`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--rose-deeper)', textDecoration: 'none', background: 'rgba(224,166,175,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(224,166,175,0.3)' }}
                    >
                      <Pencil size={12} /> Build
                    </Link>
                    <button
                      onClick={() => openAssign(w)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--sky-deeper)', background: 'rgba(168,203,222,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(168,203,222,0.3)', cursor: 'pointer' }}
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

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              New Worksheet
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label htmlFor="ws-title">Title</Label>
              <Input
                id="ws-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Linear Equations — Week 4"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} style={{ background: 'var(--rose)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}>
              {saving ? 'Creating…' : 'Create & Build'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={(o) => { if (!o) setAssignOpen(false); }}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              Assign Worksheet
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <p style={{ fontSize: 14, color: 'var(--slate)', margin: 0 }}>
              <strong style={{ color: 'var(--charcoal)' }}>{selectedWorksheet?.title}</strong> will be assigned to the selected student. A new session will be created immediately.
            </p>
            <div>
              <Label htmlFor="admin-assign-student">Student</Label>
              {studentsLoading ? (
                <p style={{ fontSize: 13, color: 'var(--mist)', marginTop: 4 }}>Loading students…</p>
              ) : (
                <select
                  id="admin-assign-student"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--fog)', fontSize: 14, color: 'var(--charcoal)', background: 'var(--white)', fontFamily: "'Syne', sans-serif" }}
                >
                  {students.length === 0 ? (
                    <option value="">No students found</option>
                  ) : (
                    students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assignSaving || !selectedStudentId || studentsLoading} style={{ background: 'var(--rose)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}>
              {assignSaving ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
