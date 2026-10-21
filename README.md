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
