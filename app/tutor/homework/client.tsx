'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, BookOpen, Key, Plus, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import type { HomeworkRow, StudentOption } from './page';

interface UploadedFile { url: string; name: string; }

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: 'var(--white)',
  border: '1px solid var(--fog)',
  color: 'var(--charcoal)',
  fontFamily: "'Syne', sans-serif",
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export default function TutorHomeworkClient({
  homework: initial,
  students,
}: {
  homework: HomeworkRow[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [homework, setHomework] = useState(initial);
  const [title, setTitle] = useState('');
  const [studentId, setStudentId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [problemFile, setProblemFile] = useState<UploadedFile | null>(null);
  const [answerFile, setAnswerFile] = useState<UploadedFile | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!problemFile) { toast.error('Please upload a problem set PDF.'); return; }
    if (!studentId) { toast.error('Please select a student.'); return; }
    if (!scheduledDate) { toast.error('Please choose a date.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, studentId, scheduledDate,
          problemPdfUrl: problemFile.url,
          answerPdfUrl: answerFile?.url ?? null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Homework assigned!');
      setTitle(''); setStudentId(''); setScheduledDate(''); setProblemFile(null); setAnswerFile(null);
      router.refresh();
    } catch {
      toast.error('Failed to save homework.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this homework assignment?')) return;
    const res = await fetch(`/api/homework/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setHomework((prev) => prev.filter((h) => h.id !== id));
    toast.success('Deleted.');
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="eyebrow-sky mb-3">Tutor Portal</div>
        <h1 className="portal-section-title">Homework</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Assign independent practice to your students for a specific day.
        </p>
      </div>

      {/* Assign form */}
      <div className="portal-card-rose p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(77,143,174,0.15)', border: '1px solid rgba(77,143,174,0.25)' }}
          >
            <Plus className="h-4 w-4" style={{ color: 'var(--sky-deeper)' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            Assign New Homework
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--mist)' }}
              >
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 5 Math Problems"
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,203,222,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--mist)' }}
              >
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                style={{ ...inputStyle, appearance: 'none' as const }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,203,222,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="">Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--mist)' }}
              >
                Day to Do It
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,203,222,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Problem PDF */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--mist)' }}
              >
                Problem Set PDF
              </label>
              {problemFile ? (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'rgba(168,203,222,0.12)',
                    border: '1px solid rgba(168,203,222,0.35)',
                    color: 'var(--sky-deeper)',
                  }}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-xs">{problemFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setProblemFile(null)}
                    style={{ color: 'var(--sky-deeper)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl border-2 border-dashed flex items-center justify-center p-4"
                  style={{ borderColor: 'rgba(168,203,222,0.4)', background: 'var(--sky-ultra)' }}
                >
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(res) => {
                      if (res[0]) setProblemFile({ url: res[0].ufsUrl, name: res[0].name });
                      toast.success('Problem PDF uploaded!');
                    }}
                    onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                    appearance={{
                      button: 'bg-[#A8CBDE] text-[#1A1D23] text-xs font-semibold py-2 px-4 rounded-lg font-[Syne]',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Answer Key */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--mist)' }}
              >
                Answer Key{' '}
                <span style={{ color: 'var(--cloud)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              {answerFile ? (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'rgba(224,166,175,0.12)',
                    border: '1px solid rgba(224,166,175,0.35)',
                    color: 'var(--rose-deeper)',
                  }}
                >
                  <Key className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-xs">{answerFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAnswerFile(null)}
                    style={{ color: 'var(--rose-deeper)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl border-2 border-dashed flex items-center justify-center p-4"
                  style={{ borderColor: 'rgba(224,166,175,0.4)', background: 'var(--rose-ultra)' }}
                >
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(res) => {
                      if (res[0]) setAnswerFile({ url: res[0].ufsUrl, name: res[0].name });
                      toast.success('Answer key uploaded!');
                    }}
                    onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                    appearance={{
                      button: 'bg-[#E0A6AF] text-[#1A1D23] text-xs font-semibold py-2 px-4 rounded-lg font-[Syne]',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={saving || !problemFile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: saving || !problemFile ? 'var(--fog)' : 'var(--sky)',
                color: saving || !problemFile ? 'var(--mist)' : 'var(--charcoal)',
                border: 'none',
                cursor: saving || !problemFile ? 'not-allowed' : 'pointer',
              }}
            >
              <Upload className="h-4 w-4" />
              {saving ? 'Saving…' : 'Assign Homework'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing homework */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--mist)' }}>
            All Assigned Homework
            {homework.length > 0 && (
              <span className="ml-2 normal-case font-semibold" style={{ color: 'var(--sky-deeper)' }}>
                ({homework.length})
              </span>
            )}
          </h2>
        </div>

        {homework.length === 0 ? (
          <div className="portal-card flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--sky-ultra)', border: '1px solid rgba(168,203,222,0.25)' }}
            >
              <FileText className="h-5 w-5" style={{ color: 'var(--sky-deeper)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
              No homework assigned yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
              Use the form above to assign your first homework.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {homework.map((hw, idx) => (
              <div
                key={hw.id}
                className="portal-card flex items-center gap-4 px-5 py-4 transition-all"
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(168,203,222,0.35)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--fog)'; }}
              >
                <div
                  className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'rgba(77,143,174,0.12)', color: 'var(--sky-deeper)', border: '1px solid rgba(77,143,174,0.22)' }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--charcoal)' }}>
                    {hw.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--mist)' }}>
                    {hw.student_name} · {format(new Date(hw.scheduled_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={hw.problem_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: 'rgba(168,203,222,0.14)',
                      color: 'var(--sky-deeper)',
                      border: '1px solid rgba(168,203,222,0.3)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(168,203,222,0.25)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(168,203,222,0.14)'; }}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Problems
                  </a>
                  {hw.answer_pdf_url && (
                    <a
                      href={hw.answer_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: 'rgba(224,166,175,0.14)',
                        color: 'var(--rose-deeper)',
                        border: '1px solid rgba(224,166,175,0.3)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(224,166,175,0.25)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(224,166,175,0.14)'; }}
                    >
                      <Key className="h-3.5 w-3.5" />
                      Key
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(hw.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                    style={{
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: 'var(--cloud)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#991B1B'; e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cloud)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
