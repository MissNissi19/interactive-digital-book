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
the logged-in student (`cms/src/utils/student-owned.ts`). Students can only
list, read, update and delete their own entries; admins see everything in the
Strapi dashboard and can filter by student. Role permissions are granted on
startup in `cms/src/index.ts`.

Students sign up / log in through the standard endpoints
(`POST /api/auth/local/register`, `POST /api/auth/local`) and send the returned
`jwt` as `Authorization: Bearer <jwt>`.
