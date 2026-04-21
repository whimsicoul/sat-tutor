'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      rememberMe: rememberMe ? 'true' : 'false',
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

    router.push(role === 'admin' ? '/admin' : role === 'tutor' ? '/tutor/problem-sets' : '/student/problem-sets');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--page-bg)' }}
    >
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-[420px] shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, var(--rose-pale) 0%, var(--sky-pale) 100%)',
          borderRight: '1px solid var(--fog)',
        }}
      >
        {/* Orbs */}
        <div
          className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(168,203,222,0.5) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(224,166,175,0.45) 0%, transparent 65%)' }}
        />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10" style={{ textDecoration: 'none' }}>
          <svg
            width="36"
            height="24"
            viewBox="0 0 90 60"
            xmlns="http://www.w3.org/2000/svg"
            style={{ borderRadius: 5, flexShrink: 0, boxShadow: '0 1px 6px rgba(0,0,0,0.18)', border: '0.5px solid rgba(0,0,0,0.08)' }}
          >
            <rect width="90" height="60" fill="#FFFFFF" />
            <rect x="0" y="25" width="90" height="10" fill="#C8102E" />
            <rect x="0" y="42" width="90" height="10" fill="#C8102E" />
            <polygon fill="#C8102E" points="15,4.5 17.18,10.84 23.89,10.84 18.36,14.82 20.54,21.16 15,17.18 9.46,21.16 11.64,14.82 6.11,10.84 12.82,10.84" />
            <polygon fill="#C8102E" points="45,4.5 47.18,10.84 53.89,10.84 48.36,14.82 50.54,21.16 45,17.18 39.46,21.16 41.64,14.82 36.11,10.84 42.82,10.84" />
            <polygon fill="#C8102E" points="75,4.5 77.18,10.84 83.89,10.84 78.36,14.82 80.54,21.16 75,17.18 69.46,21.16 71.64,14.82 66.11,10.84 72.82,10.84" />
          </svg>
          <span className="text-base font-semibold" style={{ color: 'var(--charcoal)' }}>
            DC SAT Tutor
          </span>
        </Link>

        {/* Central quote */}
        <div className="relative z-10">
          <div
            className="w-10 h-0.5 mb-8 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--rose) 0%, var(--sky) 100%)' }}
          />
          <blockquote
            className="text-2xl leading-snug mb-6"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: 'var(--charcoal)',
              letterSpacing: '-0.01em',
            }}
          >
            &ldquo;Every score starts with a single session.&rdquo;
          </blockquote>
          <p className="text-sm" style={{ color: 'var(--slate)' }}>
            Washington D.C. · SAT Preparation
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 relative z-10">
          {[
            { val: '200+', lbl: 'Avg. Score Gain' },
            { val: '98%', lbl: 'Satisfaction Rate' },
          ].map((s) => (
            <div
              key={s.lbl}
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)' }}
            >
              <p
                className="text-2xl font-bold mb-0.5"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--rose-deeper)' }}
              >
                {s.val}
              </p>
              <p className="text-xs" style={{ color: 'var(--slate)' }}>{s.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <svg
              width="30"
              height="20"
              viewBox="0 0 90 60"
              xmlns="http://www.w3.org/2000/svg"
              style={{ borderRadius: 4, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.18)', border: '0.5px solid rgba(0,0,0,0.08)' }}
            >
              <rect width="90" height="60" fill="#FFFFFF" />
              <rect x="0" y="25" width="90" height="10" fill="#C8102E" />
              <rect x="0" y="42" width="90" height="10" fill="#C8102E" />
              <polygon fill="#C8102E" points="15,4.5 17.18,10.84 23.89,10.84 18.36,14.82 20.54,21.16 15,17.18 9.46,21.16 11.64,14.82 6.11,10.84 12.82,10.84" />
              <polygon fill="#C8102E" points="45,4.5 47.18,10.84 53.89,10.84 48.36,14.82 50.54,21.16 45,17.18 39.46,21.16 41.64,14.82 36.11,10.84 42.82,10.84" />
              <polygon fill="#C8102E" points="75,4.5 77.18,10.84 83.89,10.84 78.36,14.82 80.54,21.16 75,17.18 69.46,21.16 71.64,14.82 66.11,10.84 72.82,10.84" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
              DC SAT Tutor
            </span>
          </div>

          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: 'var(--charcoal)',
              letterSpacing: '-0.025em',
            }}
          >
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--slate)' }}>
            Sign in to access your portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: 'var(--mist)' }}
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
                className="portal-input"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: 'var(--mist)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="portal-input"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  style={{ color: 'var(--mist)', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-1">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--rose)', cursor: 'pointer' }}
              />
              <label
                htmlFor="rememberMe"
                className="text-sm select-none"
                style={{ color: 'var(--slate)', cursor: 'pointer' }}
              >
                Remember me for 30 days
              </label>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm"
                style={{
                  background: 'var(--rose-ultra)',
                  border: '1px solid rgba(224,166,175,0.4)',
                  color: 'var(--rose-deeper)',
                }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all mt-2"
              style={{
                background: loading ? 'rgba(224,166,175,0.5)' : 'var(--rose)',
                color: 'var(--charcoal)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--mist)' }}>
            Don&apos;t have an account?{' '}
            <span style={{ color: 'var(--slate)' }}>Contact your tutor to get set up.</span>
          </p>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--fog)' }}>
            <Link
              href="/"
              className="text-xs transition-colors"
              style={{ color: 'var(--mist)', textDecoration: 'none' }}
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
