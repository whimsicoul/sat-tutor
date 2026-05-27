import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, TrendingUp, ClipboardList, Coffee, CalendarDays, Target, PenLine } from 'lucide-react';
import { DCFlagIcon } from '@/components/ui/dc-flag';

interface Tutor {
  id: string;
  name: string;
  email: string;
}

export default function HomePage({ tutors, userRole }: { tutors: Tutor[]; userRole: string | null }) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--page-bg)', color: 'var(--charcoal)' }}
    >
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(250,251,253,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--fog)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <DCFlagIcon width={36} height={24} />
            <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--charcoal)' }}>
              DC SAT Tutor
            </span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--slate)' }}>
              <a href="#about" className="transition-colors hover:text-[color:var(--rose-dark)]">About</a>
              <a href="#approach" className="transition-colors hover:text-[color:var(--rose-dark)]">Our Approach</a>
              <a href="#tutors" className="transition-colors hover:text-[color:var(--rose-dark)]">Our Tutors</a>
            </nav>
            {userRole ? (
              <Link
                href={userRole === 'admin' ? '/admin' : userRole === 'tutor' ? '/tutor/schedule' : '/student/schedule'}
                className="btn-rose text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="btn-rose text-sm">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(/493446241.webp)',
          backgroundSize: 'cover',
          backgroundPosition: '60% 40%',
          borderBottom: '1px solid var(--fog)',
        }}
      >
        {/* Overlay to keep text legible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(15,35,55,0.52)' }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-28 lg:py-44">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="eyebrow-sky-light mb-8">
              Washington D.C. · SAT Preparation
            </div>

            <h1
              className="text-5xl lg:text-7xl font-bold leading-[1.05] mb-8 text-balance"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                color: '#E8F4FC',
                letterSpacing: '-0.025em',
              }}
            >
              Score Higher.
              <br />
              <span style={{ color: '#7EC8E3' }}>Go Further.</span>
            </h1>

            <p
              className="text-lg lg:text-xl leading-relaxed mb-10 max-w-xl"
              style={{ color: '#B8D9EC' }}
            >
              Personalized SAT tutoring that transforms students into confident test-takers.
              Expert guidance, proven strategies, and real results.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:gap-3"
                style={{ background: '#7EC8E3', color: '#0F2337', letterSpacing: '0.01em' }}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#about"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium transition-all"
                style={{ color: '#E8F4FC', border: '1px solid rgba(147,201,232,0.4)', background: 'rgba(255,255,255,0.1)' }}
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-24 lg:py-32" style={{ background: 'linear-gradient(135deg, #EAF4FA 0%, #FDF0F2 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Section header */}
          <div className="section-divider mb-16"><span>About</span></div>

          <div className="max-w-2xl">
              <h2
                className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-balance"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--charcoal)', letterSpacing: '-0.025em' }}
              >
                The tutoring experience that changes everything.
              </h2>
              <p className="text-base leading-relaxed mb-5" style={{ color: 'var(--slate)' }}>
                At DC SAT Tutor, we believe every student deserves a customized path to their best
                score. That starts before the first session: we compare ACT and SAT diagnostic
                results, walk students through the structure of the test, and build a daily practice
                rhythm that fits their life.
              </p>
              <p className="text-base leading-relaxed mb-10" style={{ color: 'var(--slate)' }}>
                Every step in our program is designed to build genuine understanding — not just
                test-taking tricks. By the end, students leave better prepared for the SAT and
                more confident as learners.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--sky)', color: 'var(--charcoal)' }}
              >
                Access Your Portal <ArrowRight className="h-4 w-4" />
              </Link>
          </div>
        </div>
      </section>

      {/* ── Our Approach ── */}
      <section
        id="approach"
        className="py-24 lg:py-32"
        style={{
          background: 'linear-gradient(135deg, #F3F9FC 0%, #FDF5F6 100%)',
          borderTop: '1px solid var(--fog)',
          borderBottom: '1px solid var(--fog)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="section-divider mb-16"><span>Our Approach</span></div>

          <div className="text-center mb-16">
            <h2
              className="text-4xl lg:text-5xl font-bold leading-tight mb-4 text-balance"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                color: 'var(--charcoal)',
                letterSpacing: '-0.025em',
              }}
            >
              A proven, step-by-step system.
            </h2>
            <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--slate)' }}>
              Every student follows the same structured cycle — personalized at every turn.
            </p>
          </div>

          <div className="relative">
            {/* Vertical connector line */}
            <div
              className="absolute left-[23px] top-12 bottom-12 w-px hidden sm:block"
              style={{ background: 'var(--fog)' }}
              aria-hidden="true"
            />

            <div className="flex flex-col gap-10">
              {[
                {
                  n: 1,
                  icon: <ClipboardList className="h-5 w-5" />,
                  title: 'Test Selection',
                  body: 'Start with full practice tests for both the ACT and SAT. Compare scores side by side to determine which test plays to your strengths — before committing to either.',
                  accent: 'sky',
                },
                {
                  n: 2,
                  icon: <BookOpen className="h-5 w-5" />,
                  title: 'Test Fundamentals',
                  body: "Meet with your tutor to understand exactly how the test works — scoring systems, question types, module structures, and section weighting. Most students are surprised by what they learn.",
                  accent: 'rose',
                },
                {
                  n: 3,
                  icon: <Coffee className="h-5 w-5" />,
                  title: 'Daily Practice Problems',
                  body: 'Five "breakfast problems" every morning: 15–20 minutes, easy to medium difficulty. Consistent daily exposure builds pattern recognition faster than any single cram session.',
                  accent: 'sky',
                },
                {
                  n: 4,
                  icon: <CalendarDays className="h-5 w-5" />,
                  title: 'Weekly Tutoring Sessions',
                  body: "Each session opens by reviewing the breakfast problems you struggled with. Your tutor identifies error patterns — careless mistakes, concept gaps, or test-strategy issues — and adjusts the plan.",
                  accent: 'rose',
                },
                {
                  n: 5,
                  icon: <Target className="h-5 w-5" />,
                  title: 'Targeted Mini-Lessons',
                  body: "Custom interactive worksheets built around your specific weaknesses. A focused lesson aligned to exactly what you need — no time wasted on material you already know.",
                  accent: 'sky',
                },
                {
                  n: 6,
                  icon: <PenLine className="h-5 w-5" />,
                  title: 'Guided Problem Practice',
                  body: "Work through harder problems together after the lesson. Your tutor is there to guide, not just watch — building confidence and mastery through deliberate practice.",
                  accent: 'rose',
                },
                {
                  n: 7,
                  icon: <TrendingUp className="h-5 w-5" />,
                  title: 'Ongoing Progress',
                  body: "Repeat the cycle. Once you're ready, take another full practice test to track real improvement and sharpen the focus for the next round. The system compounds.",
                  accent: 'sky',
                },
              ].map((step) => {
                const isSky = step.accent === 'sky';
                const numBg = isSky ? 'rgba(168,203,222,0.25)' : 'rgba(224,166,175,0.25)';
                const numColor = isSky ? 'var(--sky-deeper)' : 'var(--rose-deeper)';
                const iconBg = isSky ? 'var(--sky-ultra)' : 'var(--rose-ultra)';
                const borderColor = isSky ? 'rgba(168,203,222,0.35)' : 'rgba(224,166,175,0.35)';

                return (
                  <div key={step.n} className="flex gap-5 sm:gap-7 items-start">
                    {/* Number badge */}
                    <div
                      className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: numBg,
                        color: numColor,
                        fontFamily: "'Syne', sans-serif",
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {step.n}
                    </div>

                    {/* Content card */}
                    <div
                      className="flex-1 rounded-2xl p-6 transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'var(--white)',
                        border: `1px solid ${borderColor}`,
                        boxShadow: '0 1px 3px rgba(26,29,35,0.04), 0 4px 16px rgba(26,29,35,0.03)',
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: iconBg, color: numColor }}
                        >
                          {step.icon}
                        </div>
                        <h3 className="text-base font-semibold" style={{ color: 'var(--charcoal)' }}>
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--slate)' }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tutors ── */}
      <section
        id="tutors"
        className="py-24 lg:py-32"
        style={{ background: 'linear-gradient(135deg, #D6EDF8 0%, #F9E5E8 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="section-divider mb-4"><span>Our Team</span></div>

          <div className="text-center mb-16">
            <h2
              className="text-4xl lg:text-5xl font-bold"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--charcoal)', letterSpacing: '-0.025em' }}
            >
              Meet our tutors.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Featured owner card */}
            <div
              className="p-7 rounded-2xl flex flex-col items-center text-center"
              style={{
                background: 'linear-gradient(145deg, var(--sky-pale) 0%, var(--rose-pale) 100%)',
                border: '1px solid rgba(168,203,222,0.35)',
                boxShadow: '0 4px 24px rgba(26,29,35,0.07)',
              }}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-2 ring-[color:var(--sky)] ring-offset-2">
                <Image
                  src="/thomas-headshot.jpg"
                  alt="Thomas Coulon"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <p className="text-base font-semibold mb-0.5" style={{ color: 'var(--charcoal)' }}>
                Thomas Coulon
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--sky-deeper)' }}>Founder &amp; Tutor</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--slate)' }}>
                I run DC SAT Tutors and often fill in for tutoring sessions. I was a math major at Hamilton College and got a perfect score on the ACT!
              </p>
            </div>

            {/* Juliette Warga card */}
            <div
              className="p-7 rounded-2xl flex flex-col items-center text-center"
              style={{
                background: 'linear-gradient(145deg, var(--rose-pale) 0%, var(--sky-pale) 100%)',
                border: '1px solid rgba(224,166,175,0.3)',
                boxShadow: '0 4px 24px rgba(26,29,35,0.07)',
              }}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-2 ring-[color:var(--rose)] ring-offset-2">
                <Image
                  src="/jules-headshot.jpeg"
                  alt="Juliette Warga"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <p className="text-base font-semibold mb-0.5" style={{ color: 'var(--charcoal)' }}>
                Juliette Warga
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--rose-deeper)' }}>SAT Tutor</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--slate)' }}>
                I&apos;m a soon-to-be Georgetown University graduate with a major in History and minors in Arabic and Education Policy. Next year I will be teaching Upper School History at Washington Latin PCS. Outside of school, I play ultimate frisbee on 1–3 teams at once!
              </p>
            </div>

            {tutors.map((tutor, i) => (
              <div
                key={tutor.id}
                className="p-7 rounded-2xl flex flex-col items-center text-center"
                style={{
                  background: i % 2 === 0
                    ? 'linear-gradient(145deg, var(--rose-pale) 0%, var(--sky-pale) 100%)'
                    : 'var(--white)',
                  border: i % 2 === 0
                    ? '1px solid rgba(224,166,175,0.3)'
                    : '1px solid var(--fog)',
                  boxShadow: '0 4px 24px rgba(26,29,35,0.05)',
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
                  style={{ background: 'rgba(168,203,222,0.25)', color: 'var(--sky-deeper)' }}
                >
                  {tutor.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--charcoal)' }}>
                  {tutor.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--mist)' }}>SAT Tutor</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #A8CBDE 0%, #E0A6AF 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="eyebrow-sky justify-center mb-6">
            Get Started Today
          </div>
          <h2
            className="text-3xl lg:text-5xl font-bold mb-5 text-balance"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--charcoal)', letterSpacing: '-0.025em' }}
          >
            Ready to reach your best score?
          </h2>
          <p className="text-base mb-10 max-w-md mx-auto" style={{ color: 'var(--slate)' }}>
            Log in to access your worksheets, review your schedule, or manage your students.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:gap-3"
            style={{ background: 'var(--rose)', color: 'var(--charcoal)' }}
          >
            Sign In to Your Portal <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8" style={{ background: 'var(--white)', borderTop: '1px solid var(--fog)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <DCFlagIcon width={27} height={18} />
            <span className="text-sm font-medium" style={{ color: 'var(--slate)' }}>DC SAT Tutor</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--mist)' }}>
            © {new Date().getFullYear()} DC SAT Tutor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
