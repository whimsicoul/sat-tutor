'use client';

import { useState } from 'react';
import { Star, Trash2, MessageSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { TestimonialRow } from './page';

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

export default function AdminTestimonialsClient({ testimonials: initial }: { testimonials: TestimonialRow[] }) {
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
      <div>
        <div className="eyebrow-rose mb-3">Admin Portal</div>
        <h1 className="portal-section-title">Testimonials</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Manage the student testimonials shown on the public home page.
        </p>
      </div>

      <div className="portal-card-rose p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(224,166,175,0.2)', border: '1px solid rgba(224,166,175,0.3)' }}
          >
            <Plus className="h-4 w-4" style={{ color: 'var(--rose-deeper)' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
            Add New Testimonial
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                Student Name
              </label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Alex M."
                required
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(224,166,175,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                Rating
              </label>
              <div
                className="flex items-center gap-1 px-3.5 py-2.5 rounded-lg"
                style={{ background: 'var(--white)', border: '1px solid var(--fog)' }}
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
                      fill={n <= rating ? '#E0A6AF' : 'transparent'}
                      stroke={n <= rating ? '#E0A6AF' : 'var(--cloud)'}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs" style={{ color: 'var(--mist)' }}>{rating}/5</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
              Testimonial
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did the student say?"
              rows={3}
              required
              style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '80px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(224,166,175,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fog)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: saving ? 'var(--fog)' : 'var(--rose)',
              color: saving ? 'var(--mist)' : 'var(--charcoal)',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <MessageSquare className="h-4 w-4" />
            {saving ? 'Adding…' : 'Add Testimonial'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--mist)' }}>
          All Testimonials
          {testimonials.length > 0 && (
            <span className="ml-2 normal-case font-semibold" style={{ color: 'var(--rose-deeper)' }}>
              ({testimonials.length})
            </span>
          )}
        </h2>

        {testimonials.length === 0 ? (
          <div className="portal-card flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: 'var(--rose-deeper)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>No testimonials yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>Use the form above to add the first testimonial.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="portal-card p-5 transition-all"
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(224,166,175,0.35)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--fog)'; }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'rgba(224,166,175,0.18)', color: 'var(--rose-deeper)' }}
                      >
                        {t.author_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--charcoal)' }}>{t.author_name}</p>
                        <p className="text-xs" style={{ color: 'var(--mist)' }}>{format(new Date(t.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex gap-0.5 ml-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3.5 w-3.5"
                            fill={i < t.rating ? '#E0A6AF' : 'transparent'}
                            stroke={i < t.rating ? '#E0A6AF' : 'var(--cloud)'}
                          />
                        ))}
                      </div>
                    </div>
                    <p
                      className="text-sm leading-relaxed pl-11"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--slate)', fontStyle: 'italic', fontSize: '1rem' }}
                    >
                      &ldquo;{t.content}&rdquo;
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0"
                    style={{ background: 'transparent', border: '1px solid transparent', color: 'var(--cloud)', cursor: 'pointer' }}
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
