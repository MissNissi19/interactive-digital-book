# Interactive Digital Book

Aviation radio communication and mapping platform.

Live: https://interactive-digital-book.netlify.app

## Structure

- `app/`, `components/`, `lib/` – Next.js frontend
- `data/` – airport data
- `scripts/` – data build scripts
- `cms/` – Strapi CMS

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Scripts

- `pnpm dev` – start the development server
- `pnpm build` – production build
- `pnpm start` – run the production build
- `pnpm data:airports` – regenerate airport data

## CMS

```bash
cd cms
npm install
npm run develop
```

### Per-student data

Book content (chapters, scenarios, drills, questions, tests, alphabet) is shared
and publicly readable. Each student gets their own account (Users & Permissions)
and their own entries in three collections:

| Collection          | REST endpoint             | Stores                                   |
| ------------------- | ------------------------- | ---------------------------------------- |
| Test Result         | `/api/test-results`       | score / total / passed for a timed test  |
| Exercise Attempt    | `/api/exercise-attempts`  | listening / readback / spelling runs     |
| Student Progress    | `/api/student-progresses` | current chapter, completed chapters      |

Every entry has a `student` relation that is set automatically from the JWT of
the logged-in student (`cms/src/utils/student-owned.ts`). The relation is
One-to-Many from the user's side: the User content type
(`cms/src/extensions/users-permissions/content-types/user/schema.json`) exposes
`testResults`, `exerciseAttempts` and `studentProgress`, so opening a user in
the dashboard (or `GET /api/users/me?populate[testResults]=true`) lists that
student's entries. Students can only
list, read, update and delete their own entries; admins see everything in the
Strapi dashboard and can filter by student. Role permissions are granted on
startup in `cms/src/index.ts`.

Students sign up / log in through the standard endpoints
(`POST /api/auth/local/register`, `POST /api/auth/local`) and send the returned
`jwt` as `Authorization: Bearer <jwt>`.

### Teacher dashboard (`/admin`)

The Next.js app ships a simple English dashboard for the client/teacher at
`/admin` (`app/admin`, `lib/admin`, `components/admin`). It lists every student
with country, native language, level, current chapter, tests passed and last
activity, lets the teacher filter by country/search, add students, and edit each
student's profile, progress (current / completed chapters), notes and blocked
status. All data lives in Strapi: the profile fields (`fullName`, `country`,
`nativeLanguage`, `level`, `notes`) are on the Users & Permissions User, the
progress in `student-progress`.

Access is restricted to Strapi users with the **Teacher** role
(`plugin::users-permissions` role type `teacher`, created automatically on
startup). To give someone access: Strapi admin → Content Manager → User → set
`role` to *Teacher*. The teacher signs in at `/admin/login` with that user's
email/username and password; the JWT is stored in an httpOnly cookie and all
requests to Strapi are made server-side using `STRAPI_URL`.

### Student accounts in the book

Readers can **Sign in / Create account** from the book header
(`components/student-auth.tsx`). The session is a Strapi Users & Permissions JWT
kept in an httpOnly cookie (`student_jwt`); the browser only calls the app's own
`/api/student/*` route handlers, which forward to Strapi with that token:

| Route                            | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `POST /api/student/login`        | `auth/local` → cookie + current progress             |
| `POST /api/student/register`     | `auth/local/register` → cookie                       |
| `POST /api/student/logout`       | clears the cookie                                    |
| `GET /api/student/me`            | current user + latest progress                       |
| `PUT /api/student/progress`      | upserts the student's `student-progress` entry       |
| `POST /api/student/test-results` | stores a finished test                               |
| `POST /api/student/exercise-attempts` | stores a finished listening/readback/spelling run |

While signed in, the book saves automatically (`lib/student/client.tsx`): the
current chapter and completed chapters on every chapter change, each submitted
radio test (`components/tests-chapter.tsx`) and each finished exercise
(`components/exercises-chapter.tsx`). Signing in reopens the book at the saved
chapter. Everything shows up in the teacher dashboard at `/admin` and in Strapi.
Without an account the book still works; nothing is saved.
