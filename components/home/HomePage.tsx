import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, TrendingUp, Award, Users } from 'lucide-react';
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

        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-36">
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

          {/* Stats */}
          <div
            className="mt-20 pt-12 grid grid-cols-2 lg:grid-cols-4 gap-8"
            style={{ borderTop: '1px solid rgba(147,201,232,0.25)' }}
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
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#7EC8E3' }}
                >
                  {stat.value}
                </div>
                <div className="text-xs tracking-wide uppercase" style={{ color: '#93C9E8' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-24 lg:py-32" style={{ background: 'linear-gradient(135deg, #EAF4FA 0%, #FDF0F2 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Section header */}
          <div className="section-divider mb-16"><span>About</span></div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2
                className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-balance"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--charcoal)', letterSpacing: '-0.025em' }}
              >
                The tutoring experience that changes everything.
              </h2>
              <p className="text-base leading-relaxed mb-5" style={{ color: 'var(--slate)' }}>
                At DC SAT Tutor, we believe every student deserves a customized path to their best
                score. We don&apos;t believe in one-size-fits-all prep — we build strategies around
                each student&apos;s unique strengths, weaknesses, and goals.
              </p>
              <p className="text-base leading-relaxed mb-10" style={{ color: 'var(--slate)' }}>
                From targeted problem sets to flexible scheduling, every tool in our program is
                designed to build genuine understanding — not just test-taking tricks. Students
                leave our program not just better prepared for the SAT, but better equipped for
                college coursework.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--sky)', color: 'var(--charcoal)' }}
              >
                Access Your Portal <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: <BookOpen className="h-5 w-5" />,
                  title: 'Custom Problem Sets',
                  desc: 'Targeted practice materials assigned to each student based on their diagnostic performance.',
                  accent: 'rose',
                },
                {
                  icon: <TrendingUp className="h-5 w-5" />,
                  title: 'Proven Results',
                  desc: 'Students see measurable score improvements, tracked session by session.',
                  accent: 'sky',
                },
                {
                  icon: <Award className="h-5 w-5" />,
                  title: 'Expert Instruction',
                  desc: 'Deep knowledge of the current SAT format and scoring, with strategies that work.',
                  accent: 'sky',
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  title: 'Flexible Scheduling',
                  desc: 'Propose, confirm, and manage sessions through the student and tutor portals.',
                  accent: 'rose',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-5 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{
                    background: feature.accent === 'rose' ? 'var(--rose-ultra)' : 'var(--sky-ultra)',
                    border: `1px solid ${feature.accent === 'rose' ? 'rgba(224,166,175,0.25)' : 'rgba(168,203,222,0.25)'}`,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{
                      background: feature.accent === 'rose' ? 'rgba(224,166,175,0.25)' : 'rgba(168,203,222,0.25)',
                      color: feature.accent === 'rose' ? 'var(--rose-deeper)' : 'var(--sky-deeper)',
                    }}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--charcoal)' }}>
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--slate)' }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
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
            Log in to access your problem sets, review your schedule, or manage your students.
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
