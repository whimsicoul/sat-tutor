'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, FileText, BookOpen, Key, Trash2 } from 'lucide-react';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminHomeworkRow, UserOption } from './page';

interface UploadedFile { url: string; name: string; }

export default function AdminHomeworkClient({
  homework: initial,
  students,
}: {
  homework: AdminHomeworkRow[];
  students: UserOption[];
}) {
  const router = useRouter();
  const [homework, setHomework] = useState<AdminHomeworkRow[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: '', studentId: '', scheduledDate: '' });
  const [problemFile, setProblemFile] = useState<UploadedFile | null>(null);
  const [answerFile, setAnswerFile] = useState<UploadedFile | null>(null);

  function resetForm() {
    setForm({ title: '', studentId: '', scheduledDate: '' });
    setProblemFile(null);
    setAnswerFile(null);
  }

  async function handleCreate() {
    if (!form.title || !form.studentId || !form.scheduledDate || !problemFile) {
      toast.error('Please fill in all required fields and upload the problem PDF');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          studentId: form.studentId,
          scheduledDate: form.scheduledDate,
          problemPdfUrl: problemFile.url,
          answerPdfUrl: answerFile?.url,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Homework assigned!');
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign homework');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this homework assignment?')) return;
    const res = await fetch(`/api/admin/homework/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setHomework((prev) => prev.filter((h) => h.id !== id));
    toast.success('Deleted.');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)' }}>
            Homework
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--mist)' }}>
            Assign independent practice to students for specific days.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2"
          style={{ background: 'var(--sky-deeper)', color: 'white', border: 'none' }}
        >
          <Plus className="h-4 w-4" />
          Assign Homework
        </Button>
      </div>

      {/* Table */}
      <div className="portal-card overflow-hidden p-0">
        {homework.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--sky-ultra)', border: '1px solid rgba(168,203,222,0.25)' }}
            >
              <FileText className="h-5 w-5" style={{ color: 'var(--sky-deeper)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>No homework assigned yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>Click &quot;Assign Homework&quot; to get started.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--fog)' }}>
                {['Title', 'Student', 'Date', 'Assigned By', 'Files', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--mist)',
                      background: 'var(--frost)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {homework.map((hw, i) => (
                <tr
                  key={hw.id}
                  style={{ borderBottom: i < homework.length - 1 ? '1px solid var(--fog)' : 'none' }}
                >
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: 'var(--charcoal)' }}>
                    {hw.title}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)' }}>
                    {hw.student_name}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)' }}>
                    {format(new Date(hw.scheduled_date), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)' }}>
                    {hw.assigned_by_name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={hw.problem_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                        style={{ background: 'rgba(168,203,222,0.14)', color: 'var(--sky-deeper)', textDecoration: 'none', border: '1px solid rgba(168,203,222,0.3)' }}
                      >
                        <BookOpen className="h-3 w-3" /> Problems
                      </a>
                      {hw.answer_pdf_url && (
                        <a
                          href={hw.answer_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                          style={{ background: 'rgba(224,166,175,0.14)', color: 'var(--rose-deeper)', textDecoration: 'none', border: '1px solid rgba(224,166,175,0.3)' }}
                        >
                          <Key className="h-3 w-3" /> Key
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleDelete(hw.id)}
                      className="w-7 h-7 flex items-center justify-center rounded transition-all"
                      style={{ background: 'transparent', border: 'none', color: 'var(--cloud)', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#991B1B'; e.currentTarget.style.background = '#FEE2E2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cloud)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Assign Homework</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="hw-title">Title</Label>
                <Input
                  id="hw-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. 5 Reading Questions"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hw-student">Student</Label>
                <select
                  id="hw-student"
                  value={form.studentId}
                  onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="hw-date">Day to Do It</Label>
                <Input
                  id="hw-date"
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Problem PDF */}
            <div>
              <Label>Problem Set PDF</Label>
              {problemFile ? (
                <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(168,203,222,0.12)', border: '1px solid rgba(168,203,222,0.3)', color: 'var(--sky-deeper)' }}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-xs">{problemFile.name}</span>
                  <button type="button" onClick={() => setProblemFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--sky-deeper)' }}>×</button>
                </div>
              ) : (
                <div className="mt-1 rounded-lg border-2 border-dashed flex items-center justify-center p-3" style={{ borderColor: 'rgba(168,203,222,0.4)', background: 'var(--sky-ultra)' }}>
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(res) => { if (res[0]) setProblemFile({ url: res[0].ufsUrl, name: res[0].name }); toast.success('Uploaded!'); }}
                    onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                    appearance={{ button: 'bg-[#A8CBDE] text-[#1A1D23] text-xs font-semibold py-1.5 px-3 rounded font-[Syne]' }}
                  />
                </div>
              )}
            </div>

            {/* Answer Key */}
            <div>
              <Label>Answer Key <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {answerFile ? (
                <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(224,166,175,0.12)', border: '1px solid rgba(224,166,175,0.3)', color: 'var(--rose-deeper)' }}>
                  <Key className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-xs">{answerFile.name}</span>
                  <button type="button" onClick={() => setAnswerFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--rose-deeper)' }}>×</button>
                </div>
              ) : (
                <div className="mt-1 rounded-lg border-2 border-dashed flex items-center justify-center p-3" style={{ borderColor: 'rgba(224,166,175,0.4)', background: 'var(--rose-ultra)' }}>
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(res) => { if (res[0]) setAnswerFile({ url: res[0].ufsUrl, name: res[0].name }); toast.success('Uploaded!'); }}
                    onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                    appearance={{ button: 'bg-[#E0A6AF] text-[#1A1D23] text-xs font-semibold py-1.5 px-3 rounded font-[Syne]' }}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} style={{ background: 'var(--sky-deeper)', color: 'white', border: 'none' }}>
              {saving ? 'Saving…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
