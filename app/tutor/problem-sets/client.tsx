'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, BookOpen, Key, Plus, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import type { ProblemSetRow, StudentOption } from './page';

interface UploadedFile { url: string; name: string; }

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#FFFFFF',
  border: '1px solid #D5D9E1',
  color: '#1F1F1F',
  fontFamily: "'Syne', sans-serif",
  transition: 'border-color 0.15s',
};

export default function TutorProblemSetsClient({
  problemSets: initial,
  students,
}: {
  problemSets: ProblemSetRow[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [problemSets, setProblemSets] = useState(initial);
  const [title, setTitle] = useState('');
  const [studentId, setStudentId] = useState('');
  const [problemFile, setProblemFile] = useState<UploadedFile | null>(null);
  const [answerFile, setAnswerFile] = useState<UploadedFile | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!problemFile) { toast.error('Please upload a problem set PDF.'); return; }
    if (!studentId) { toast.error('Please select a student.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/problem-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, studentId,
          problemPdfUrl: problemFile.url,
          answerPdfUrl: answerFile?.url ?? null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Problem set assigned!');
      setTitle(''); setStudentId(''); setProblemFile(null); setAnswerFile(null);
      router.refresh();
    } catch {
      toast.error('Failed to save problem set.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this problem set?')) return;
    const res = await fetch(`/api/problem-sets/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setProblemSets((prev) => prev.filter((p) => p.id !== id));
    toast.success('Deleted.');
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-6" style={{ background: '#8BB5AE' }} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: '#8BB5AE', fontFamily: "'Syne', sans-serif" }}
          >
            Tutor Portal
          </span>
        </div>
        <h1 className="portal-section-title">Problem Sets</h1>
        <p className="text-sm mt-1" style={{ color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}>
          Upload and assign practice materials to your students.
        </p>
      </div>

      {/* Assign form */}
      <div className="portal-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: '#F0F2F5', border: '1px solid #D5D9E1' }}
          >
            <Plus className="h-4 w-4" style={{ color: '#8BB5AE' }} />
          </div>
          <h2
            className="text-sm font-semibold"
            style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}
          >
            Assign New Problem Set
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SAT Math Practice #3"
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8BB5AE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#D5D9E1'; }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                style={{ ...inputStyle, appearance: 'none' as const }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8BB5AE'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#D5D9E1'; }}
              >
                <option value="">Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Problem PDF */}
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                Problem Set PDF
              </label>
              {problemFile ? (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded text-sm"
                  style={{ background: 'rgba(139,181,174,0.12)', border: '1px solid #8BB5AE', color: '#2A6B62', fontFamily: "'Syne', sans-serif" }}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-xs">{problemFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setProblemFile(null)}
                    style={{ color: '#2A6B62', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  className="rounded border-2 border-dashed flex items-center justify-center p-4"
                  style={{ borderColor: '#D5D9E1', background: '#F8F9FB' }}
                >
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(res) => {
                      if (res[0]) setProblemFile({ url: res[0].ufsUrl, name: res[0].name });
                      toast.success('Problem PDF uploaded!');
                    }}
                    onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                    appearance={{
                      button: 'bg-[#1F1F1F] text-[#F0F2F5] text-xs font-medium py-2 px-4 rounded font-[Syne]',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Answer Key */}
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                Answer Key <span style={{ color: '#B0B8C4', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              {answerFile ? (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded text-sm"
                  style={{ background: 'rgba(224,166,175,0.12)', border: '1px solid #E0A6AF', color: '#9B4C5A', fontFamily: "'Syne', sans-serif" }}
                >
                  <Key className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-xs">{answerFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAnswerFile(null)}
                    style={{ color: '#9B4C5A', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  className="rounded border-2 border-dashed flex items-center justify-center p-4"
                  style={{ borderColor: '#D5D9E1', background: '#F8F9FB' }}
                >
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(res) => {
                      if (res[0]) setAnswerFile({ url: res[0].ufsUrl, name: res[0].name });
                      toast.success('Answer key uploaded!');
                    }}
                    onUploadError={(e) => { toast.error(`Upload error: ${e.message}`); }}
                    appearance={{
                      button: 'bg-[#4A4F5A] text-[#F0F2F5] text-xs font-medium py-2 px-4 rounded font-[Syne]',
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
              className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-all"
              style={{
                background: saving || !problemFile ? '#D5D9E1' : '#1F1F1F',
                color: saving || !problemFile ? '#8A9099' : '#F0F2F5',
                border: 'none',
                cursor: saving || !problemFile ? 'not-allowed' : 'pointer',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              <Upload className="h-4 w-4" />
              {saving ? 'Saving…' : 'Assign Problem Set'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing problem sets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}
          >
            All Assigned Sets
            {problemSets.length > 0 && (
              <span className="ml-2 normal-case" style={{ color: '#8BB5AE' }}>
                ({problemSets.length})
              </span>
            )}
          </h2>
        </div>

        {problemSets.length === 0 ? (
          <div className="portal-card flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: '#F0F2F5', border: '1px solid #D5D9E1' }}
            >
              <FileText className="h-5 w-5" style={{ color: '#8BB5AE' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}>
              No problem sets yet
            </p>
            <p className="text-xs mt-1" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
              Use the form above to assign your first set.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {problemSets.map((ps, idx) => (
              <div
                key={ps.id}
                className="portal-card flex items-center gap-4 px-5 py-4"
              >
                <div
                  className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold"
                  style={{ background: '#F0F2F5', color: '#8A9099', border: '1px solid #D5D9E1', fontFamily: "'Syne', sans-serif" }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}
                  >
                    {ps.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                    {ps.student_name} · {format(new Date(ps.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={ps.problem_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
                    style={{
                      background: '#F0F2F5',
                      color: '#1F1F1F',
                      border: '1px solid #D5D9E1',
                      textDecoration: 'none',
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Problems
                  </a>
                  {ps.answer_pdf_url && (
                    <a
                      href={ps.answer_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
                      style={{
                        background: 'rgba(224,166,175,0.12)',
                        color: '#9B4C5A',
                        border: '1px solid #E0A6AF',
                        textDecoration: 'none',
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      <Key className="h-3.5 w-3.5" />
                      Key
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(ps.id)}
                    className="w-8 h-8 flex items-center justify-center rounded transition-all"
                    style={{
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: '#B0B8C4',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#991B1B'; e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#B0B8C4'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
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
