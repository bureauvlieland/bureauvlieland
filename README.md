# Bureau Vlieland

Website, klantportaal, partnerportaal en admin voor Bureau Vlieland.

## Technologie

- Frontend: Vite, TypeScript, React, shadcn-ui, Tailwind CSS (gehost op Netlify)
- Backend: Supabase (database, edge functions, storage)

## Lokaal werken

Node.js en npm zijn nodig ([installeren met nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
npm i
npm run dev
```

Tests: `npx vitest run`. Typecheck: `npx tsc -p tsconfig.app.json --noEmit`.

## Naar productie

- Frontend: een merge naar `main` publiceert automatisch via Netlify.
- Backend (`supabase/`): een merge naar `main` deployt via de GitHub-workflow
  "Deploy Supabase".

Zie [docs/deployen.md](docs/deployen.md), en [docs/werkwijze.md](docs/werkwijze.md)
voor de werkafspraken.
