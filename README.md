# ALFA Studio X

> **Experimental Vite workspace for AI-assisted creative, workflow and model-management interfaces**

ALFA Studio X is a TypeScript/React front end built with Vite and Tailwind. The
codebase presents screens for image editing, rendering, workflows, providers,
clusters, model settings, automation, prompt memory and project administration.
It also contains Supabase Edge Function and migration sources.

## Implemented areas

```text
src/components/editor/       canvas, layers, toolbar and export UI
src/components/render/       queue, presets, parameters and history UI
src/components/workflow/     node/workflow controls and monitoring UI
src/lib/providers/           provider definitions and registry
src/integrations/supabase/   browser client and generated types
supabase/functions/          Edge Function source
supabase/migrations/         database migrations
```

Several provider and rendering integrations are represented by UI and client
code. Their presence does not mean that an account, model, API key or hosted
backend is supplied by this repository.

## Requirements

- current Node.js and npm;
- a Supabase project only for flows that use the Supabase functions or data
  layer;
- accounts and credentials for any optional external AI or rendering service.

## Local development

```bash
npm ci
npm run dev
```

The project defines build, lint and Vitest commands:

```bash
npm run build
npm run lint
npm run test
```

## Configuration

The application includes `src/integrations/supabase/client.ts` and Edge
Functions under `supabase/functions/`. Supply environment values through local
development configuration or the deployment platform; do not commit project
keys, provider keys, payment credentials or user data. Review each function's
required variables before deploying it.

## Status and limits

This is an experimental UI and integration workspace. It has no declared
end-to-end deployment procedure, and visual controls do not independently
verify remote job execution, content rights, billing or output quality.

## Licence

No root licence file is tracked. Contact the repository owner before reuse.
