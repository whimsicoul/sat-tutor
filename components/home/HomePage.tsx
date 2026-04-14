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
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: '#F8F7F4',
        color: '#1A1A2E',
      }}
    >
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(248,247,244,0.95)',
          backdropFilter: 'blur(8px)',
          borderColor: '#D4C5A9',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
              style={{ background: '#1A1A2E' }}
            >
              DC
            </div>
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "'Georgia', serif", color: '#1A1A2E' }}
            >
              DC SAT Tutor
            </span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: '#5C5C7A' }}>
              <a href="#about" className="hover:text-[#1A1A2E] transition-colors">About</a>
              <a href="#testimonials" className="hover:text-[#1A1A2E] transition-colors">Results</a>
            </nav>
            <Link href="/login">
              <button
                className="text-sm font-medium px-4 py-2 rounded transition-all"
                style={{
                  background: '#1A1A2E',
                  color: '#F8F7F4',
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
      <section className="relative overflow-hidden" style={{ background: '#1A1A2E' }}>
        {/* Decorative grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(#C9A84C 1px, transparent 1px),
              linear-gradient(90deg, #C9A84C 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Diagonal accent */}
        <div
          className="absolute right-0 top-0 w-1/2 h-full opacity-10"
          style={{
            background: 'linear-gradient(135deg, transparent 40%, #C9A84C 100%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-36">
          <div className="max-w-3xl">
            {/* Eyebrow label */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12" style={{ background: '#C9A84C' }} />
              <span
                className="text-xs tracking-widest uppercase font-medium"
                style={{ color: '#C9A84C' }}
              >
                Washington D.C. · SAT Preparation
              </span>
            </div>

            <h1
              className="text-5xl lg:text-7xl font-bold leading-[1.05] mb-8"
              style={{
                color: '#F8F7F4',
                fontFamily: "'Georgia', serif",
                letterSpacing: '-0.02em',
              }}
            >
              Score Higher.
              <br />
              <span style={{ color: '#C9A84C' }}>Go Further.</span>
            </h1>

            <p
              className="text-lg lg:text-xl leading-relaxed mb-10 max-w-xl"
              style={{ color: '#A8A8C0', fontFamily: "'Georgia', serif" }}
            >
              Personalized SAT tutoring that transforms students into confident test-takers.
              Expert guidance, proven strategies, and real results.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <button
                  className="inline-flex items-center gap-2 px-8 py-4 rounded text-base font-semibold transition-all hover:gap-4"
                  style={{
                    background: '#C9A84C',
                    color: '#1A1A2E',
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
                  color: '#A8A8C0',
                  border: '1px solid rgba(168,168,192,0.3)',
                }}
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Stats Row */}
          <div
            className="mt-20 pt-12 grid grid-cols-2 lg:grid-cols-4 gap-8"
            style={{ borderTop: '1px solid rgba(201,168,76,0.2)' }}
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
                  style={{ color: '#C9A84C', fontFamily: "'Georgia', serif" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs tracking-wide uppercase" style={{ color: '#5C5C7A' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 lg:py-32" style={{ background: '#F8F7F4' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Section header */}
          <div className="flex items-center gap-4 mb-16">
            <div className="h-px flex-1" style={{ background: '#D4C5A9' }} />
            <span
              className="text-xs tracking-widest uppercase font-medium px-4"
              style={{ color: '#9B8B6E' }}
            >
              About
            </span>
            <div className="h-px flex-1" style={{ background: '#D4C5A9' }} />
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2
                className="text-4xl lg:text-5xl font-bold leading-tight mb-6"
                style={{
                  fontFamily: "'Georgia', serif",
                  color: '#1A1A2E',
                  letterSpacing: '-0.02em',
                }}
              >
                The tutoring experience that changes everything.
              </h2>
              <p
                className="text-base leading-relaxed mb-6"
                style={{ color: '#5C5C7A', fontFamily: "'Georgia', serif" }}
              >
                At DC SAT Tutor, we believe every student deserves a customized path to their best
                score. We don&apos;t believe in one-size-fits-all prep — we build strategies around
                each student&apos;s unique strengths, weaknesses, and goals.
              </p>
              <p
                className="text-base leading-relaxed mb-10"
                style={{ color: '#5C5C7A', fontFamily: "'Georgia', serif" }}
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
                    background: '#1A1A2E',
                    color: '#F8F7F4',
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
                },
                {
                  icon: <TrendingUp className="h-5 w-5" />,
                  title: 'Proven Results',
                  desc: 'Students see measurable score improvements, tracked session by session.',
                },
                {
                  icon: <Award className="h-5 w-5" />,
                  title: 'Expert Instruction',
                  desc: 'Deep knowledge of the current SAT format and scoring, with strategies that work.',
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  title: 'Flexible Scheduling',
                  desc: 'Propose, confirm, and manage sessions through the student and tutor portals.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-5 rounded-lg"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E8E0D4',
                    boxShadow: '0 2px 8px rgba(26,26,46,0.04)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center mb-3 text-white"
                    style={{ background: '#1A1A2E' }}
                  >
                    {feature.icon}
                  </div>
                  <h3
                    className="text-sm font-semibold mb-1.5"
                    style={{ fontFamily: "'Georgia', serif", color: '#1A1A2E' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#8A7A6A' }}>
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
        style={{ background: '#F0EDE6' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px flex-1" style={{ background: '#D4C5A9' }} />
            <span
              className="text-xs tracking-widest uppercase font-medium px-4"
              style={{ color: '#9B8B6E' }}
            >
              Results
            </span>
            <div className="h-px flex-1" style={{ background: '#D4C5A9' }} />
          </div>

          <div className="text-center mb-16">
            <h2
              className="text-4xl lg:text-5xl font-bold leading-tight"
              style={{
                fontFamily: "'Georgia', serif",
                color: '#1A1A2E',
                letterSpacing: '-0.02em',
              }}
            >
              What students say.
            </h2>
          </div>

          {testimonials.length === 0 ? (
            <div
              className="text-center py-16 rounded-xl"
              style={{ background: '#FFFFFF', border: '1px solid #E8E0D4', color: '#9B8B6E' }}
            >
              <p className="text-sm" style={{ fontFamily: "'Georgia', serif" }}>
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
                    background: i % 3 === 1 ? '#1A1A2E' : '#FFFFFF',
                    border: i % 3 === 1 ? 'none' : '1px solid #E8E0D4',
                    boxShadow: '0 4px 20px rgba(26,26,46,0.06)',
                  }}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className="h-4 w-4"
                        fill={idx < t.rating ? '#C9A84C' : 'transparent'}
                        stroke={idx < t.rating ? '#C9A84C' : '#D4C5A9'}
                      />
                    ))}
                  </div>

                  <blockquote
                    className="flex-1 text-base leading-relaxed mb-6"
                    style={{
                      fontFamily: "'Georgia', serif",
                      color: i % 3 === 1 ? '#A8A8C0' : '#5C5C7A',
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{t.content}&rdquo;
                  </blockquote>

                  <div
                    className="h-px mb-5"
                    style={{ background: i % 3 === 1 ? 'rgba(201,168,76,0.3)' : '#E8E0D4' }}
                  />

                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background: '#C9A84C',
                        color: '#1A1A2E',
                      }}
                    >
                      {t.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{
                          fontFamily: "'Georgia', serif",
                          color: i % 3 === 1 ? '#F8F7F4' : '#1A1A2E',
                        }}
                      >
                        {t.author_name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: i % 3 === 1 ? '#5C5C7A' : '#9B8B6E' }}
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
        style={{ background: '#1A1A2E' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12" style={{ background: '#C9A84C' }} />
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: '#C9A84C' }}
            >
              Get Started Today
            </span>
            <div className="h-px w-12" style={{ background: '#C9A84C' }} />
          </div>
          <h2
            className="text-3xl lg:text-4xl font-bold mb-4"
            style={{
              fontFamily: "'Georgia', serif",
              color: '#F8F7F4',
              letterSpacing: '-0.02em',
            }}
          >
            Ready to reach your best score?
          </h2>
          <p
            className="text-base mb-10"
            style={{ color: '#A8A8C0', fontFamily: "'Georgia', serif" }}
          >
            Log in to access your problem sets, review your schedule, or manage your students.
          </p>
          <Link href="/login">
            <button
              className="inline-flex items-center gap-2 px-8 py-4 rounded text-base font-semibold transition-all"
              style={{ background: '#C9A84C', color: '#1A1A2E' }}
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
        style={{ background: '#F8F7F4', borderColor: '#D4C5A9' }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#1A1A2E' }}
            >
              DC
            </div>
            <span className="text-sm" style={{ color: '#9B8B6E', fontFamily: "'Georgia', serif" }}>
              DC SAT Tutor
            </span>
          </div>
          <p className="text-xs" style={{ color: '#B8A898' }}>
            © {new Date().getFullYear()} DC SAT Tutor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
