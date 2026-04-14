'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth/session');
    const data = await res.json();
    const role = data?.user?.role;

    router.push(role === 'tutor' ? '/tutor/problem-sets' : '/student/problem-sets');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#1F1F1F' }}
    >
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-96 shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #2C2C2C 0%, #1F1F1F 100%)',
          borderRight: '1px solid rgba(139,181,174,0.12)',
        }}
      >
        {/* Teal glow */}
        <div
          className="absolute bottom-0 left-0 w-64 h-64 opacity-20"
          style={{ background: 'radial-gradient(ellipse at bottom left, #8BB5AE 0%, transparent 70%)' }}
        />
        {/* Rose glow */}
        <div
          className="absolute top-0 right-0 w-48 h-48 opacity-10"
          style={{ background: 'radial-gradient(ellipse at top right, #E0A6AF 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div
            className="w-9 h-9 rounded flex items-center justify-center font-bold text-sm"
            style={{ background: '#8BB5AE', color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}
          >
            DC
          </div>
          <span
            className="text-base font-semibold"
            style={{ color: '#F0F2F5', fontFamily: "'Syne', sans-serif" }}
          >
            DC SAT Tutor
          </span>
        </Link>

        {/* Central quote */}
        <div className="relative z-10">
          <div className="h-px w-10 mb-8" style={{ background: '#8BB5AE' }} />
          <blockquote
            className="text-2xl leading-snug mb-6"
            style={{ color: '#F0F2F5', fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '-0.01em' }}
          >
            "Every score starts with a single session."
          </blockquote>
          <p className="text-sm" style={{ color: 'rgba(240,242,245,0.35)', fontFamily: "'Syne', sans-serif" }}>
            Washington D.C. · SAT Preparation
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 relative z-10">
          {[
            { val: '200+', lbl: 'Avg. Score Gain' },
            { val: '98%', lbl: 'Satisfaction Rate' },
          ].map((s) => (
            <div key={s.lbl}>
              <p
                className="text-2xl font-bold mb-0.5"
                style={{ color: '#8BB5AE', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {s.val}
              </p>
              <p className="text-xs" style={{ color: 'rgba(240,242,245,0.35)', fontFamily: "'Syne', sans-serif" }}>
                {s.lbl}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs"
              style={{ background: '#8BB5AE', color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}
            >
              DC
            </div>
            <span className="text-sm font-semibold" style={{ color: '#F0F2F5', fontFamily: "'Syne', sans-serif" }}>
              DC SAT Tutor
            </span>
          </div>

          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: '#F0F2F5', fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '-0.02em' }}
          >
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(240,242,245,0.4)', fontFamily: "'Syne', sans-serif" }}>
            Sign in to access your portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: 'rgba(240,242,245,0.45)', fontFamily: "'Syne', sans-serif" }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F0F2F5',
                  fontFamily: "'Syne', sans-serif",
                  caretColor: '#8BB5AE',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,181,174,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: 'rgba(240,242,245,0.45)', fontFamily: "'Syne', sans-serif" }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F0F2F5',
                  fontFamily: "'Syne', sans-serif",
                  caretColor: '#8BB5AE',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,181,174,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded text-sm"
                style={{
                  background: 'rgba(224,166,175,0.1)',
                  border: '1px solid rgba(224,166,175,0.3)',
                  color: '#E0A6AF',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm font-semibold transition-all mt-2"
              style={{
                background: loading ? 'rgba(139,181,174,0.5)' : '#8BB5AE',
                color: '#1F1F1F',
                fontFamily: "'Syne', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p
            className="text-xs text-center mt-6"
            style={{ color: 'rgba(240,242,245,0.25)', fontFamily: "'Syne', sans-serif" }}
          >
            Don&apos;t have an account?{' '}
            <span style={{ color: 'rgba(240,242,245,0.45)' }}>Contact your tutor to get set up.</span>
          </p>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <Link
              href="/"
              className="text-xs"
              style={{ color: 'rgba(240,242,245,0.3)', fontFamily: "'Syne', sans-serif", textDecoration: 'none' }}
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
