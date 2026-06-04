# Atlas Car Service Dashboard

Owner and agency administration dashboard for the Atlas Drive platform. This app provides back-office tooling for managing agencies, cars, cities, traffic insights, reservations, and Supabase-powered operational workflows.

## Features

- Owner dashboard with key business metrics and traffic reporting
- Agency management and creation workflows
- Car inventory and car detail management
- City and traffic monitoring views
- Reservation and operational analytics
- Supabase authentication and serverless function integration
- Tailwind-based responsive admin UI built with React and Vite

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- React Hook Form
- Zod
- Supabase

## Project Structure

```text
src/
  components/   Reusable UI and feature components
  pages/        Route-level dashboard pages
  services/     Data access and domain services
  lib/          Shared utilities and Supabase helpers
  layouts/      App layout shells
supabase/
  functions/    Edge functions
  migrations/   Database migrations
scripts/        Local utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project

### Installation

```bash
npm install
```

### Environment Variables

Create a local `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_for_local_scripts_only
```

Notes:

- Never commit real `.env` values.
- `SUPABASE_SERVICE_ROLE_KEY` is only for trusted local scripts and server-side operations.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run seed:test-users
```

## Build

```bash
npm run build
```

## Supabase Notes

- Database changes live in `supabase/migrations/`
- Edge functions live in `supabase/functions/`
- Review deployment and secret setup before publishing functions

## Git Safety

- `.env` files are ignored by Git
- Build outputs and temporary files are ignored
- Review any demo credentials or local-only scripts before pushing publicly

## License

Private project. All rights reserved.
