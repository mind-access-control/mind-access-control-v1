# Mind Access Control

A modular access control system with separate frontend and backend components.

## Project Structure

```
mind-access-control-v1/
├── frontend/           # Next.js frontend application
│   ├── app/           # Next.js app directory
│   │   ├── admin/     # Admin routes
│   │   └── page.tsx   # Main page
│   ├── components/    # React components
│   │   └── ui/        # UI components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions and shared code
│   ├── public/        # Static assets
│   └── styles/        # Global styles and Tailwind configuration
│
└── backend/           # Express.js backend application
    ├── src/
    │   ├── config/    # Configuration files
    │   ├── controllers/ # Route controllers
    │   ├── middleware/  # Express middleware
    │   └── routes/     # API routes
    └── dist/          # Compiled TypeScript files
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mind-access-control-v1
   ```

2. Install dependencies for all workspaces:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Frontend: Create `.env.local` in the frontend directory
   - Backend: Create `.env` in the backend directory
   
   Required variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development

Run both frontend and backend in development mode:
```bash
pnpm dev
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:3001

### Available Scripts

- `pnpm dev` - Run both frontend and backend in development mode
- `pnpm build` - Build both frontend and backend
- `pnpm start` - Start both in production mode
- `pnpm install:all` - Install dependencies for all workspaces
- `pnpm install:frontend` - Install frontend dependencies
- `pnpm install:backend` - Install backend dependencies

## Technologies Used

### Frontend
- Next.js 15
- React 19
- Tailwind CSS
- Radix UI
- Supabase Client

### Backend
- Express.js
- TypeScript
- Supabase
- CORS
- dotenv

## Features
- Admin authentication
- Role-based access control
- Modern UI with Tailwind CSS
- Type-safe development with TypeScript
- Modular architecture for scalability