# DC SAT Tutor

A full-stack tutoring management platform for a Washington D.C. SAT prep service. Built with Next.js 14 (App Router), Neon Postgres, and NextAuth v5. The platform serves three distinct user roles — student, tutor, and admin — each with a dedicated portal, bespoke scheduling tools, and a daily practice system called Breakfast Problems.

Live at **https://dc-sat-tutor.up.railway.app/**

---

## Features

### Student Portal
- **Breakfast Problems** — daily SAT practice questions (English and Math) served each morning; students submit answers and receive explanations after completion
- **Problem Sets** — access PDF-based assignments attached to sessions by their tutor
- **Schedule** — view upcoming sessions on a calendar, request new sessions, and export session details to `.ics` or Google Calendar
- **Test Results** — review SAT score history over time
- **Settings** — update profile and change password

### Tutor Portal
- **Schedule** — propose and manage sessions with assigned students; create recurring session series
- **Problem Sets** — upload PDF problem sets and attach them to individual sessions
- **Breakfast Problems** — review per-student daily practice results and flag questions for review
- **Test Results** — view scores across all assigned students
- **Settings** — update profile and change password

### Admin Portal
- **Dashboard** — live stats (active tutors, students, upcoming sessions, pending approvals) with quick action links
- **User Management** — create, edit, and deactivate tutor and student accounts
- **Tutor–Student Assignments** — pair tutors with their students
- **Schedule** — full oversight of all sessions; bulk status updates and recurring series management
- **Problem Sets** — manage the problem set library across all sessions
- **Breakfast Problems** — manage the question pool; import questions from PDFs via MuPDF parsing; crop and review image assets; view aggregate results
- **Test Results** — track SAT score history across all students
- **Testimonials** — manage public testimonials displayed on the landing page
- **Settings** — update profile and change password

### Platform-wide
- **Role-based routing** — middleware enforces portal boundaries; unauthenticated users are redirected to login
- **Email notifications** — session proposals and status changes trigger emails via Resend
- **File uploads** — PDFs and images uploaded via UploadThing (tutor/admin access only)
- **Calendar export** — `.ics` download and Google Calendar URL generation per session

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Neon Serverless Postgres |
| Auth | NextAuth v5 — credentials + JWT |
| UI components | Base UI + shadcn/ui patterns |
| Styling | Tailwind CSS + CSS custom properties |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| Calendar view | react-big-calendar + date-fns |
| Calendar export | ics + google-calendar-url |
| File uploads | UploadThing |
| Email | Resend |
| PDF parsing | MuPDF (server-side, breakfast problems import) |
| Toasts | Sonner |
| Deployment | Railway (nixpacks) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- A [Resend](https://resend.com) API key
- An [UploadThing](https://uploadthing.com) token

### Environment Variables

Create a `.env.local` file in the project root:

```env
DATABASE_URL=your_neon_connection_string
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
UPLOADTHING_TOKEN=your_uploadthing_token
RESEND_API_KEY=your_resend_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
```

### Database Setup

Run the migration scripts against your Neon database in order:

```bash
# Core schema (users, sessions, problem sets, assignments, recurring series)
psql $DATABASE_URL -f scripts/migrate.sql

# Breakfast problems tables
psql $DATABASE_URL -f scripts/migrate_breakfast_problems.sql

# SAT test dates
psql $DATABASE_URL -f scripts/migrate_sat_test_dates.sql

# Test results
psql $DATABASE_URL -f scripts/migrate_test_results.sql

# Answer explanations column (breakfast problems)
psql $DATABASE_URL -f scripts/migrate_answer_explanation.sql

# Seed the initial admin account
npx tsx scripts/seed-admin.ts
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  page.tsx                  # Public landing page
  login/                    # Login page
  student/                  # Student portal
    breakfast-problems/     # Daily practice questions
    problem-sets/           # Assigned problem sets
    schedule/               # Session calendar
    settings/               # Account settings
    test-results/           # SAT score history
  tutor/                    # Tutor portal
    breakfast-problems/     # Student practice results
    problem-sets/           # Problem set management
    schedule/               # Session management + recurring series
    settings/               # Account settings
    test-results/           # Student score tracking
  admin/                    # Admin portal
    assignments/            # Tutor–student pairings
    breakfast-problems/     # Question pool + crop review + results
    problem-sets/           # Problem set library
    schedule/               # All sessions + bulk management
    settings/               # Account settings
    testimonials/           # Landing page testimonials
    test-results/           # All-student score tracking
    users/                  # User management
  api/                      # API routes (REST, role-scoped)

components/
  ui/                       # Base UI primitives (button, dialog, select, etc.)
  shared/                   # Navbar, SessionProvider, SettingsClient, TodayDate
  admin/                    # AdminSidebar
  student/                  # StudentSidebar
  tutor/                    # TutorSidebar
  home/                     # HomePage landing component

lib/
  auth.ts                   # NextAuth configuration
  auth.config.ts            # JWT session strategy + remember-me logic
  db.ts                     # Type-safe Neon query helpers
  email.ts                  # Resend email templates
  calendar.ts               # ICS generation + Google Calendar URLs
  uploadthing.ts            # UploadThing router configuration
  utils.ts                  # cn() Tailwind class merge utility

scripts/
  migrate.sql                      # Core schema
  migrate_breakfast_problems.sql   # Breakfast problems tables
  migrate_sat_test_dates.sql       # SAT test dates table
  migrate_test_results.sql         # Test results table
  migrate_answer_explanation.sql   # Answer explanation column
  seed-admin.ts                    # Admin account seeder
  seed-explanations.ts             # Breakfast problem explanation seeder
  auto-crop-images.mjs             # Image crop utility for breakfast problems
```

---

## User Roles

| Role | Access |
|---|---|
| `student` | Breakfast problems, assigned problem sets, schedule, test results |
| `tutor` | Session management, problem set creation, breakfast problem results, test results |
| `admin` | Full access: all of the above plus user management, tutor–student assignments, testimonials |

---

## Design System

The UI uses a dual-accent palette — **dusty rose** for student-facing surfaces and **sky blue** for tutor-facing surfaces — expressed as CSS custom properties and applied consistently across all portals. Typography pairs Cormorant Garamond (serif headings) with Syne (sans-serif body).

```
Rose:  #E0A6AF  (primary)  →  #C8838E  →  #A85F6A  (deeper)
Sky:   #A8CBDE  (primary)  →  #7AAEC7  →  #4D8FAE  (deeper)
Text:  #1A1D23  (charcoal) →  #4A5060  (slate)  →  #8A91A0  (mist)
```
