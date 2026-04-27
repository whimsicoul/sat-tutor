'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Upload, Trash2, Coffee, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { BreakfastProblem } from './page';

interface CsvRow {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  category?: string;
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).filter(Boolean).map((line) => {
    const values =
      line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((v) => v.replace(/^"|"$/g, '').trim()) ?? [];
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])) as unknown as CsvRow;
  });
}

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);

export default function AdminBreakfastProblemsClient({
  problems: initial,
}: {
  problems: BreakfastProblem[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<BreakfastProblem[]>(initial);
  const [uploading, setUploading] = useState(false);

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      toast.error('No data rows found in CSV.');
      return;
    }

    const invalid = rows.findIndex(
      (r) =>
        !r.question ||
        !r.choice_a ||
        !r.choice_b ||
        !r.choice_c ||
        !r.choice_d ||
        !r.correct_answer ||
        !VALID_ANSWERS.has(r.correct_answer.toUpperCase())
    );
    if (invalid !== -1) {
      toast.error(
        `Row ${invalid + 2} is invalid. Check that all fields are present and correct_answer is A, B, C, or D.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const res = await fetch('/api/admin/breakfast-problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      const { inserted } = await res.json();
      toast.success(`${inserted} problem${inserted !== 1 ? 's' : ''} added to the pool.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this problem? Students who have already been assigned it will keep their records.')) return;
    const res = await fetch(`/api/admin/breakfast-problems/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setProblems((prev) => prev.filter((p) => p.id !== id));
    toast.success('Problem deleted.');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)' }}
          >
            Breakfast Problems
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--mist)' }}>
            {problems.length} problem{problems.length !== 1 ? 's' : ''} in the pool · 5 auto-assigned to students each day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/breakfast-problems/results">
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart2 className="h-4 w-4" />
              View Results
            </Button>
          </Link>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvFile}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2"
            style={{ background: 'var(--sky-deeper)', color: 'white', border: 'none' }}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload CSV'}
          </Button>
        </div>
      </div>

      {/* CSV format hint */}
      <div
        className="rounded-lg px-4 py-3 text-xs"
        style={{ background: 'var(--frost)', border: '1px solid var(--fog)', color: 'var(--slate)' }}
      >
        <strong>CSV format:</strong> question, choice_a, choice_b, choice_c, choice_d, correct_answer, category
        &nbsp;· correct_answer must be A, B, C, or D
      </div>

      {/* Table */}
      <div className="portal-card overflow-hidden p-0">
        {problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--sky-ultra)', border: '1px solid rgba(168,203,222,0.25)' }}
            >
              <Coffee className="h-5 w-5" style={{ color: 'var(--sky-deeper)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
              No problems yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
              Upload a CSV to add problems to the pool.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--fog)' }}>
                {['Question', 'Category', 'Answer', 'Added', ''].map((h) => (
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
              {problems.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: i < problems.length - 1 ? '1px solid var(--fog)' : 'none' }}
                >
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: 13,
                      color: 'var(--charcoal)',
                      maxWidth: 420,
                    }}
                  >
                    <span
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      } as React.CSSProperties}
                    >
                      {p.question}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)' }}>
                    {p.category ?? <span style={{ color: 'var(--cloud)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: 'rgba(77,143,174,0.12)',
                        color: 'var(--sky-deeper)',
                        border: '1px solid rgba(77,143,174,0.22)',
                      }}
                    >
                      {p.correct_answer}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)' }}>
                    {format(new Date(p.created_at), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="w-7 h-7 flex items-center justify-center rounded transition-all"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--cloud)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#991B1B';
                        e.currentTarget.style.background = '#FEE2E2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--cloud)';
                        e.currentTarget.style.background = 'transparent';
                      }}
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
    </div>
  );
}
