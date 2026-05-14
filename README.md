# DC SAT Tutor

A full-stack tutoring management platform for a Washington D.C. SAT/ACT prep service. Built with Next.js 14 (App Router), Neon Postgres, and NextAuth v5. The platform serves three distinct user roles — student, tutor, and admin — each with a dedicated portal, bespoke scheduling tools, a daily practice system called Breakfast Problems, and a structured worksheet assignment system.

Live at **https://dc-sat-tutor.up.railway.app/**

---

## Features

### Student Portal
- **Breakfast Problems** — daily SAT practice questions (English and Math) served each morning; students submit answers and receive explanations after completion; supports multiple explanation screenshots per question
- **Worksheets** — multi-step guided assignments assigned by their tutor via sessions; students navigate steps sequentially, answer questions (multiple-choice or open-ended), and reveal answer keys with explanations; supports warm-up intro steps
- **Annotation Canvas** — freehand drawing overlay on worksheet pages and breakfast problem images, with a draggable floating toolbar for pen/eraser tools and color selection
- **Schedule** — view upcoming sessions on a calendar, request new sessions, and export session details to `.ics` or Google Calendar; see the worksheet assigned to each session
- **ACT Test** — take a full-length ACT practice test and see results
- **Test Results** — review SAT and ACT score history over time
- **Settings** — update profile and change password

### Tutor Portal
- **Schedule** — propose and manage sessions with assigned students; create recurring session series; assign worksheets to sessions directly from the schedule
- **Worksheets** — view worksheets you have access to; assign them to sessions
- **Breakfast Problems** — review per-student daily practice results and flag questions for review
- **ACT Test** — view student ACT test results
- **Test Results** — view scores across all assigned students
- **Settings** — update profile and change password

### Admin Portal
- **Dashboard** — live stats (active tutors, students, upcoming sessions) with quick action links
- **User Management** — create, edit, and deactivate tutor and student accounts
- **Tutor–Student Assignments** — pair tutors with their students
- **Schedule** — full oversight of all sessions; assign worksheets to sessions; bulk status updates and recurring series management
- **Worksheets** — create and manage multi-step worksheets; build steps (warm-up, instruction, or problem type); upload page images with direct PDF page number support; set question positions; define answer keys with multiple explanation screenshots; specify question types (multiple choice or open-ended); configure open-ended answer box sizing
- **Breakfast Problems** — manage the question pool; import questions from PDFs via MuPDF parsing; crop and review image assets; view aggregate results; manage review status flags
- **ACT Test** — manage ACT test pages and answer keys
- **Test Results** — track SAT and ACT score history across all students
- **Testimonials** — manage public testimonials displayed on the landing page
- **Settings** — update profile and change password

### Platform-wide
- **Role-based routing** — middleware enforces portal boundaries; unauthenticated users are redirected to login
- **Annotation Canvas** — persistent freehand drawing on any worksheet or breakfast problem page, with a draggable floating toolbar (pen, eraser, color picker, clear)
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
| PDF parsing | MuPDF (server-side, breakfast problems + worksheet import) |
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
# Core schema (users, sessions, assignments, recurring series)
psql $DATABASE_URL -f scripts/migrate.sql

# Breakfast problems tables
psql $DATABASE_URL -f scripts/migrate_breakfast_problems.sql

# SAT test dates
psql $DATABASE_URL -f scripts/migrate_sat_test_dates.sql

# Test results
psql $DATABASE_URL -f scripts/migrate_test_results.sql

# Answer explanations column (breakfast problems)
psql $DATABASE_URL -f scripts/migrate_answer_explanation.sql

# ACT test tables
psql $DATABASE_URL -f scripts/migrate_act_test.sql

# ACT scoring
psql $DATABASE_URL -f scripts/migrate_act_scoring.sql

# Worksheets
psql $DATABASE_URL -f scripts/migrate_worksheets.sql
psql $DATABASE_URL -f scripts/migrate_remove_worksheet_student.sql

# SAT date notes
psql $DATABASE_URL -f scripts/migrate_sat_date_notes.sql

# Drop deprecated problem set tables
psql $DATABASE_URL -f scripts/migrate_drop_problem_sets.sql

# Warm-up step type for worksheets
psql $DATABASE_URL -f scripts/migrate_warmup_step.sql

# Breakfast problem review status
psql $DATABASE_URL -f scripts/migrate_review_status.sql

# Multiple explanation images per question
psql $DATABASE_URL -f scripts/migrate_explanation_images_array.sql

# Open-ended answer box bottom padding
psql $DATABASE_URL -f scripts/migrate_answer_box_bottom_padding.sql

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
    worksheets/             # Assigned worksheets (step-based)
    schedule/               # Session calendar + worksheet view
    act-test/               # ACT practice test
    test-results/           # SAT/ACT score history
    settings/               # Account settings
  tutor/                    # Tutor portal
    breakfast-problems/     # Student practice results
    worksheets/             # Worksheet list + assignment
    schedule/               # Session management + recurring series
    act-test/               # ACT test view
    test-results/           # Student score tracking
    settings/               # Account settings
  admin/                    # Admin portal
    assignments/            # Tutor–student pairings
    breakfast-problems/     # Question pool + crop review + results
    worksheets/             # Worksheet builder
    schedule/               # All sessions + bulk management
    act-test/               # ACT test management
    test-results/           # All-student score tracking
    testimonials/           # Landing page testimonials
    users/                  # User management
    settings/               # Account settings
  api/                      # API routes (REST, role-scoped)

components/
  ui/                       # Base UI primitives (button, dialog, select, etc.)
  shared/                   # Navbar, SessionProvider, AnnotationCanvas, DraggableAnnotationToolbar
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
  pdf-parser.ts             # MuPDF-based PDF question extraction
  utils.ts                  # cn() Tailwind class merge + answer checking

types/
  annotations.ts            # Canvas annotation type definitions
  next-auth.d.ts            # NextAuth session type extensions

scripts/
  migrate.sql                              # Core schema
  migrate_breakfast_problems.sql          # Breakfast problems tables
  migrate_sat_test_dates.sql              # SAT test dates table
  migrate_test_results.sql                # Test results table
  migrate_answer_explanation.sql          # Answer explanation column
  migrate_act_test.sql                    # ACT test tables
  migrate_act_scoring.sql                 # ACT scoring tables
  migrate_worksheets.sql                  # Worksheet tables
  migrate_remove_worksheet_student.sql    # Worksheet schema refinement
  migrate_sat_date_notes.sql              # SAT date notes field
  migrate_drop_problem_sets.sql           # Drop deprecated problem set tables
  migrate_warmup_step.sql                 # Warm-up step type for worksheets
  migrate_review_status.sql               # Breakfast problem review status flag
  migrate_explanation_images_array.sql    # Multiple explanation screenshots
  migrate_answer_box_bottom_padding.sql   # Open-ended answer box sizing
  seed-admin.ts                           # Admin account seeder
  seed-explanations.ts                    # Breakfast problem explanation seeder
  seed_act1_answer_key.sql                # ACT 1 answer key seed data
  auto-crop-images.mjs                    # Image crop utility for breakfast problems
  convert-act-pdf-to-images-mupdf.mjs    # Convert ACT PDF pages to images (MuPDF)
  diagnose-image-crop.mjs                 # Debug tool for image crop positions
```

---

## User Roles

| Role | Access |
|---|---|
| `student` | Breakfast problems, assigned worksheets, annotation canvas, schedule, ACT test, test results |
| `tutor` | Session management, worksheet assignment, breakfast problem results, ACT test, test results |
| `admin` | Full access: all of the above plus user management, tutor–student assignments, worksheet builder, testimonials |

---

## Worksheet System

Worksheets are multi-step assignments created by admins and assigned to sessions. Each worksheet contains an ordered sequence of steps:

- **Warm-up** — introductory context or framing shown before the main problems
- **Instruction** — display-only pages for reading or reference
- **Problems** — interactive multiple-choice or open-ended questions with optional answer keys and multiple explanation screenshots

Students work through steps sequentially in their portal. Each page supports an **annotation canvas** for freehand drawing — a draggable floating toolbar lets students pick pen size, color, eraser, and clear the canvas. Tutors can assign worksheets to sessions directly from the schedule. Admins build worksheets using the drag-and-drop step builder, uploading page images (with direct PDF page number support), defining question positions, and attaching answer keys with one or more explanation screenshots.

---

## Annotation Canvas

Both worksheet pages and breakfast problem images support a persistent freehand annotation layer. Annotations are rendered on a transparent canvas overlay that sits above the page image. A **draggable floating toolbar** provides:

- Pen tool with adjustable stroke width
- Color picker
- Eraser tool
- Clear canvas button

Annotation state is preserved per-page during the session.

---

## Design System

The UI uses a dual-accent palette — **dusty rose** for student-facing surfaces and **sky blue** for tutor-facing surfaces — expressed as CSS custom properties and applied consistently across all portals. Typography pairs Cormorant Garamond (serif headings) with Syne (sans-serif body).

```
Rose:  #E0A6AF  (primary)  →  #C8838E  →  #A85F6A  (deeper)
Sky:   #A8CBDE  (primary)  →  #7AAEC7  →  #4D8FAE  (deeper)
Text:  #1A1D23  (charcoal) →  #4A5060  (slate)  →  #8A91A0  (mist)
```
