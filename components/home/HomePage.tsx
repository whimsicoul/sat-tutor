import Link from 'next/link';
import { Star, ArrowRight, BookOpen, TrendingUp, Award, Users } from 'lucide-react';

interface Testimonial {
  id: string;
  author_name: string;
  content: string;
  rating: number;
}

export default function HomePage({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'Syne', system-ui, sans-serif",
        background: '#F0F2F5',
        color: '#1F1F1F',
      }}
    >
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(240,242,245,0.95)',
          backdropFilter: 'blur(8px)',
          borderColor: '#D5D9E1',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
              style={{ background: '#1F1F1F' }}
            >
              DC
            </div>
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif", color: '#1F1F1F' }}
            >
              DC SAT Tutor
            </span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: '#6A7280' }}>
              <a href="#about" className="hover:text-[#1F1F1F] transition-colors">About</a>
              <a href="#testimonials" className="hover:text-[#1F1F1F] transition-colors">Results</a>
            </nav>
            <Link href="/login">
              <button
                className="text-sm font-medium px-4 py-2 rounded transition-all"
                style={{
                  background: '#1F1F1F',
                  color: '#F0F2F5',
                  letterSpacing: '0.02em',
                }}
              >
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: '#1F1F1F' }}>
        {/* Teal mesh overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(ellipse 70% 60% at 80% 50%, #8BB5AE 0%, transparent 70%)`,
          }}
        />
        {/* Dusty rose corner accent */}
        <div
          className="absolute right-0 bottom-0 w-72 h-72 opacity-15"
          style={{
            background: 'radial-gradient(ellipse at bottom right, #E0A6AF 0%, transparent 70%)',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #8BB5AE 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-36">
          <div className="max-w-3xl">
            {/* Eyebrow label */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12" style={{ background: '#8BB5AE' }} />
              <span
                className="text-xs tracking-widest uppercase font-medium"
                style={{ color: '#8BB5AE', fontFamily: "'Syne', sans-serif" }}
              >
                Washington D.C. · SAT Preparation
              </span>
            </div>

            <h1
              className="text-5xl lg:text-7xl font-bold leading-[1.05] mb-8"
              style={{
                color: '#F0F2F5',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                letterSpacing: '-0.02em',
              }}
            >
              Score Higher.
              <br />
              <span style={{ color: '#8BB5AE' }}>Go Further.</span>
            </h1>

            <p
              className="text-lg lg:text-xl leading-relaxed mb-10 max-w-xl"
              style={{ color: 'rgba(240,242,245,0.6)', fontFamily: "'Syne', sans-serif" }}
            >
              Personalized SAT tutoring that transforms students into confident test-takers.
              Expert guidance, proven strategies, and real results.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <button
                  className="inline-flex items-center gap-2 px-8 py-4 rounded text-base font-semibold transition-all hover:gap-4"
                  style={{
                    background: '#8BB5AE',
                    color: '#1F1F1F',
                    letterSpacing: '0.01em',
                  }}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <a
                href="#about"
                className="inline-flex items-center gap-2 px-8 py-4 rounded text-base font-medium transition-colors"
                style={{
                  color: 'rgba(240,242,245,0.6)',
                  border: '1px solid rgba(240,242,245,0.15)',
                }}
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Stats Row */}
          <div
            className="mt-20 pt-12 grid grid-cols-2 lg:grid-cols-4 gap-8"
            style={{ borderTop: '1px solid rgba(139,181,174,0.2)' }}
          >
            {[
              { value: '200+', label: 'Average Score Increase' },
              { value: '98%', label: 'Student Satisfaction' },
              { value: '1550+', label: 'Top Student Score' },
              { value: '100%', label: 'College Admission Rate' },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="text-3xl lg:text-4xl font-bold mb-1"
                  style={{ color: '#8BB5AE', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs tracking-wide uppercase" style={{ color: 'rgba(240,242,245,0.35)', fontFamily: "'Syne', sans-serif" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 lg:py-32" style={{ background: '#F0F2F5' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Section header */}
          <div className="flex items-center gap-4 mb-16">
            <div className="h-px flex-1" style={{ background: '#D5D9E1' }} />
            <span
              className="text-xs tracking-widest uppercase font-medium px-4"
              style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}
            >
              About
            </span>
            <div className="h-px flex-1" style={{ background: '#D5D9E1' }} />
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2
                className="text-4xl lg:text-5xl font-bold leading-tight mb-6"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  color: '#1F1F1F',
                  letterSpacing: '-0.02em',
                }}
              >
                The tutoring experience that changes everything.
              </h2>
              <p
                className="text-base leading-relaxed mb-6"
                style={{ color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}
              >
                At DC SAT Tutor, we believe every student deserves a customized path to their best
                score. We don&apos;t believe in one-size-fits-all prep — we build strategies around
                each student&apos;s unique strengths, weaknesses, and goals.
              </p>
              <p
                className="text-base leading-relaxed mb-10"
                style={{ color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}
              >
                From targeted problem sets to flexible scheduling, every tool in our program is
                designed to build genuine understanding — not just test-taking tricks. Students
                leave our program not just better prepared for the SAT, but better equipped for
                college coursework.
              </p>
              <Link href="/login">
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold transition-all"
                  style={{
                    background: '#1F1F1F',
                    color: '#F0F2F5',
                    letterSpacing: '0.02em',
                  }}
                >
                  Access Your Portal
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: <BookOpen className="h-5 w-5" />,
                  title: 'Custom Problem Sets',
                  desc: 'Targeted practice materials assigned to each student based on their diagnostic performance.',
                  accent: '#8BB5AE',
                },
                {
                  icon: <TrendingUp className="h-5 w-5" />,
                  title: 'Proven Results',
                  desc: 'Students see measurable score improvements, tracked session by session.',
                  accent: '#E0A6AF',
                },
                {
                  icon: <Award className="h-5 w-5" />,
                  title: 'Expert Instruction',
                  desc: 'Deep knowledge of the current SAT format and scoring, with strategies that work.',
                  accent: '#E0A6AF',
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  title: 'Flexible Scheduling',
                  desc: 'Propose, confirm, and manage sessions through the student and tutor portals.',
                  accent: '#8BB5AE',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-5 rounded-lg"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4E7EC',
                    boxShadow: '0 2px 8px rgba(31,31,31,0.04)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center mb-3"
                    style={{ background: feature.accent + '22', color: feature.accent }}
                  >
                    {feature.icon}
                  </div>
                  <h3
                    className="text-sm font-semibold mb-1.5"
                    style={{ fontFamily: "'Syne', sans-serif", color: '#1F1F1F' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#8A9099' }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="py-24 lg:py-32"
        style={{ background: '#E8EBF0' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px flex-1" style={{ background: '#D5D9E1' }} />
            <span
              className="text-xs tracking-widest uppercase font-medium px-4"
              style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}
            >
              Results
            </span>
            <div className="h-px flex-1" style={{ background: '#D5D9E1' }} />
          </div>

          <div className="text-center mb-16">
            <h2
              className="text-4xl lg:text-5xl font-bold leading-tight"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                color: '#1F1F1F',
                letterSpacing: '-0.02em',
              }}
            >
              What students say.
            </h2>
          </div>

          {testimonials.length === 0 ? (
            <div
              className="text-center py-16 rounded-xl"
              style={{ background: '#FFFFFF', border: '1px solid #E4E7EC', color: '#8A9099' }}
            >
              <p className="text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
                Testimonials coming soon. We&apos;re just getting started!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div
                  key={t.id}
                  className="p-7 rounded-xl flex flex-col"
                  style={{
                    background: i % 3 === 1 ? '#1F1F1F' : '#FFFFFF',
                    border: i % 3 === 1 ? 'none' : '1px solid #E4E7EC',
                    boxShadow: '0 4px 20px rgba(31,31,31,0.06)',
                  }}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className="h-4 w-4"
                        fill={idx < t.rating ? '#8BB5AE' : 'transparent'}
                        stroke={idx < t.rating ? '#8BB5AE' : '#D5D9E1'}
                      />
                    ))}
                  </div>

                  <blockquote
                    className="flex-1 text-base leading-relaxed mb-6"
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      color: i % 3 === 1 ? 'rgba(240,242,245,0.7)' : '#4A4F5A',
                      fontStyle: 'italic',
                      fontSize: '1.05rem',
                    }}
                  >
                    &ldquo;{t.content}&rdquo;
                  </blockquote>

                  <div
                    className="h-px mb-5"
                    style={{ background: i % 3 === 1 ? 'rgba(139,181,174,0.25)' : '#E4E7EC' }}
                  />

                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background: i % 3 === 1 ? 'rgba(139,181,174,0.2)' : '#8BB5AE22',
                        color: '#8BB5AE',
                      }}
                    >
                      {t.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{
                          fontFamily: "'Syne', sans-serif",
                          color: i % 3 === 1 ? '#F0F2F5' : '#1F1F1F',
                        }}
                      >
                        {t.author_name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: i % 3 === 1 ? 'rgba(240,242,245,0.4)' : '#8A9099' }}
                      >
                        SAT Student
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: '#1F1F1F' }}
      >
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 50%, #8BB5AE 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12" style={{ background: '#8BB5AE' }} />
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: '#8BB5AE', fontFamily: "'Syne', sans-serif" }}
            >
              Get Started Today
            </span>
            <div className="h-px w-12" style={{ background: '#8BB5AE' }} />
          </div>
          <h2
            className="text-3xl lg:text-4xl font-bold mb-4"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: '#F0F2F5',
              letterSpacing: '-0.02em',
            }}
          >
            Ready to reach your best score?
          </h2>
          <p
            className="text-base mb-10"
            style={{ color: 'rgba(240,242,245,0.5)', fontFamily: "'Syne', sans-serif" }}
          >
            Log in to access your problem sets, review your schedule, or manage your students.
          </p>
          <Link href="/login">
            <button
              className="inline-flex items-center gap-2 px-8 py-4 rounded text-base font-semibold transition-all"
              style={{ background: '#8BB5AE', color: '#1F1F1F' }}
            >
              Sign In to Your Portal
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{ background: '#F0F2F5', borderColor: '#D5D9E1' }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#1F1F1F' }}
            >
              DC
            </div>
            <span className="text-sm" style={{ color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
              DC SAT Tutor
            </span>
          </div>
          <p className="text-xs" style={{ color: '#B0B8C4' }}>
            © {new Date().getFullYear()} DC SAT Tutor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
