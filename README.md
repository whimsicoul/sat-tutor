# DC SAT Tutor

A full-stack tutoring management platform for a Washington D.C. SAT prep service. Built with Next.js 14, Neon Postgres, and NextAuth v5.

The website is live at https://dc-sat-tutor.up.railway.app/

## Features

- **Three-role access control** — student, tutor, and admin portals with role-based routing
- **Session scheduling** — students and tutors propose, confirm, and manage sessions; admins have full oversight
- **Recurring sessions** — create repeating session series with bulk management tools
- **Problem sets** — tutors assign PDF-based problem sets to students per session
- **Breakfast problems** — daily SAT practice questions (English and Math) served to students each morning; tutors and admins can manage the question pool and review per-student results
- **Test results** — track SAT score progress over time per student
- **Testimonials** — admin-managed testimonials displayed on the landing page
- **File uploads** — PDF and image uploads via UploadThing
- **Email notifications** — session alerts sent via Resend
- **Calendar export** — download .ics files or open sessions in Google Calendar
- **Tutor–student assignments** — admin pairs tutors with their students

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Neon Serverless Postgres |
| Auth | NextAuth v5 (credentials) |
| UI | shadcn/ui + Tailwind CSS |
| File uploads | UploadThing |
| Email | Resend |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| Calendar | react-big-calendar, ics, date-fns |

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

# Seed the admin account
npx tsx scripts/seed-admin.ts
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx              # Public landing page
  login/                # Login page
  student/              # Student portal
    breakfast-problems/ # Daily practice questions
    problem-sets/       # Assigned problem sets
    schedule/           # Session calendar
    settings/           # Account settings
    test-results/       # SAT score history
  tutor/                # Tutor portal (mirrors student portal + problem management)
  admin/                # Admin dashboard
    assignments/        # Tutor–student pairings
    breakfast-problems/ # Question pool + per-student results
    problem-sets/       # Problem set management
    schedule/           # All sessions overview
    settings/           # Admin settings
    testimonials/       # Testimonial management
    test-results/       # Score tracking across all students
    users/              # User management
  api/                  # API routes

components/
  ui/                   # shadcn/ui primitives + custom components
  shared/               # Navbar, SessionProvider, SettingsClient
  admin/                # AdminSidebar
  home/                 # HomePage landing component

lib/
  auth.ts               # NextAuth configuration
  db.ts                 # Database query helpers
  email.ts              # Resend email helpers
  calendar.ts           # ICS / Google Calendar URL helpers
  uploadthing.ts        # UploadThing configuration
  utils.ts              # Tailwind class merge utility

scripts/
  migrate.sql                   # Core schema (sessions, assignments, series, problem sets)
  migrate_breakfast_problems.sql # Breakfast problems tables
  migrate_sat_test_dates.sql    # SAT test dates table
  migrate_test_results.sql      # Test results table
  seed-admin.ts                 # Admin account seeder
```

## User Roles

| Role | Access |
|---|---|
| `student` | Daily breakfast problems, assigned problem sets, schedule, test results |
| `tutor` | Manage problem sets for students, view breakfast problems, manage sessions |
| `admin` | Full access: users, assignments, sessions, problem sets, breakfast problems, test results, testimonials |

## What Was Removed

- **Homework feature** — a separate homework assignment flow was planned but removed in favor of the existing problem-set-per-session model
- **Question bank scripts** — one-time PDF import and parsing scripts (`import-breakfast-pdfs.js`, `import-math-pdfs.js`, `parse-question-bank.js`) were used to seed the breakfast problems database and have been cleaned up
