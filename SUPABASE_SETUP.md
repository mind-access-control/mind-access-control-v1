# Supabase Local Development Setup Guide

## Prerequisites

1. **Docker** - Make sure Docker is installed and running
2. **Node.js** - Version 16 or higher
3. **npm/pnpm/yarn** - Any package manager

## Step 1: Install Supabase CLI

Choose one of the following methods:

### Option A: Global Installation (requires sudo)
```bash
sudo npm install -g supabase
```

### Option B: Local Installation (recommended)
```bash
npm install --save-dev supabase
```

### Option C: Using pnpm
```bash
pnpm add -g supabase
```

## Step 2: Create Environment Variables

Create a `.env.local` file in your project root with the following content:

```env
# Supabase Local Development Environment Variables
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# For Supabase Functions (if needed)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Step 3: Start Supabase

### If installed globally:
```bash
supabase start
```

### If installed locally:
```bash
npx supabase start
```

## Step 4: Verify Installation

After starting Supabase, you should see output similar to:

```
🚀 Starting Supabase...
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Step 5: Access Supabase Services

- **Supabase Studio**: http://127.0.0.1:54323
- **API**: http://127.0.0.1:54321
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Email Testing**: http://127.0.0.1:54324

## Step 6: Run Database Migrations

```bash
# If installed globally
supabase db reset

# If installed locally
npx supabase db reset
```

## Step 7: Start Your Next.js Application

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

## Useful Commands

### Stop Supabase
```bash
supabase stop
# or
npx supabase stop
```

### View Logs
```bash
supabase logs
# or
npx supabase logs
```

### Reset Database
```bash
supabase db reset
# or
npx supabase db reset
```

### Generate Types
```bash
supabase gen types typescript --local > types/supabase.ts
# or
npx supabase gen types typescript --local > types/supabase.ts
```

## Troubleshooting

### Docker Issues
- Make sure Docker is running: `sudo systemctl start docker`
- Check Docker status: `sudo systemctl status docker`

### Port Conflicts
If ports are already in use, you can modify the ports in `supabase/config.toml`

### Permission Issues
If you encounter permission issues with global installation, use local installation instead.

### Database Connection Issues
- Verify the database URL in your environment variables
- Check if Supabase is running: `supabase status`
- Reset the database if needed: `supabase db reset`

## Next Steps

1. Open Supabase Studio at http://127.0.0.1:54323
2. Create your database tables and relationships
3. Set up authentication providers if needed
4. Configure Row Level Security (RLS) policies
5. Test your application with the local Supabase instance 