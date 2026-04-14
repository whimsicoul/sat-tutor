'use client';

import { useState } from 'react';
import { Star, Trash2, MessageSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { TestimonialRow } from './page';

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#FFFFFF',
  border: '1px solid #E0D8CB',
  color: '#12192C',
  fontFamily: "'DM Sans', sans-serif",
  transition: 'border-color 0.15s',
};

export default function TestimonialsClient({ testimonials: initial }: { testimonials: TestimonialRow[] }) {
  const [testimonials, setTestimonials] = useState(initial);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, content, rating }),
      });
      if (!res.ok) throw new Error('Failed');
      const newT = await res.json();
      setTestimonials((prev) => [newT, ...prev]);
      setAuthorName(''); setContent(''); setRating(5);
      toast.success('Testimonial added!');
    } catch {
      toast.error('Failed to add testimonial.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this testimonial?')) return;
    const res = await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
    toast.success('Deleted.');
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-6" style={{ background: '#C9A84C' }} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
          >
            Tutor Portal
          </span>
        </div>
        <h1 className="portal-section-title">Testimonials</h1>
        <p className="text-sm mt-1" style={{ color: '#4A5568', fontFamily: "'DM Sans', sans-serif" }}>
          Manage the student testimonials shown on the public home page.
        </p>
      </div>

      {/* Add form */}
      <div className="portal-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: '#F8F6F1', border: '1px solid #E0D8CB' }}
          >
            <Plus className="h-4 w-4" style={{ color: '#C9A84C' }} />
          </div>
          <h2
            className="text-sm font-semibold"
            style={{ color: '#12192C', fontFamily: "'DM Sans', sans-serif" }}
          >
            Add New Testimonial
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
                Student Name
              </label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Alex M."
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#C9A84C'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E0D8CB'; }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
                Rating
              </label>
              {/* Star picker */}
              <div
                className="flex items-center gap-1 px-3.5 py-2.5 rounded"
                style={{ background: '#FFFFFF', border: '1px solid #E0D8CB' }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}
                  >
                    <Star
                      className="h-5 w-5 transition-colors"
                      fill={n <= rating ? '#C9A84C' : 'transparent'}
                      stroke={n <= rating ? '#C9A84C' : '#D4C5A9'}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
                  {rating}/5
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
              Testimonial
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did the student say about your tutoring?"
              rows={3}
              required
              style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '80px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#C9A84C'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E0D8CB'; }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-all"
            style={{
              background: saving ? '#E0D8CB' : '#12192C',
              color: saving ? '#8A95A3' : '#F8F6F1',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <MessageSquare className="h-4 w-4" />
            {saving ? 'Adding…' : 'Add Testimonial'}
          </button>
        </form>
      </div>

      {/* Testimonials list */}
      <div className="space-y-4">
        <h2
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}
        >
          All Testimonials
          {testimonials.length > 0 && (
            <span className="ml-2 normal-case" style={{ color: '#C9A84C' }}>
              ({testimonials.length})
            </span>
          )}
        </h2>

        {testimonials.length === 0 ? (
          <div className="portal-card flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: '#F8F6F1', border: '1px solid #E0D8CB' }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: '#C9A84C' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#12192C', fontFamily: "'DM Sans', sans-serif" }}>
              No testimonials yet
            </p>
            <p className="text-xs mt-1" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
              Use the form above to add your first testimonial.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {testimonials.map((t) => (
              <div key={t.id} className="portal-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Author + stars + date row */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
                      >
                        {t.author_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p
                          className="text-sm font-semibold leading-tight"
                          style={{ color: '#12192C', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {t.author_name}
                        </p>
                        <p className="text-xs" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
                          {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-0.5 ml-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3.5 w-3.5"
                            fill={i < t.rating ? '#C9A84C' : 'transparent'}
                            stroke={i < t.rating ? '#C9A84C' : '#D4C5A9'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Quote */}
                    <p
                      className="text-sm leading-relaxed pl-11"
                      style={{ color: '#4A5568', fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}
                    >
                      &ldquo;{t.content}&rdquo;
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="w-8 h-8 flex items-center justify-center rounded transition-all shrink-0"
                    style={{
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: '#C0C9D3',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#991B1B'; e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#C0C9D3'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
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
