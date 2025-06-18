# Mind Access Control System

A comprehensive access control system with facial recognition capabilities, built with Next.js, TypeScript, and Node.js.

## Features

- 🔐 **Authentication System** - Secure login with JWT tokens
- 👥 **User Management** - Create, edit, and manage users
- 📷 **Camera Integration** - Real-time camera capture for facial recognition
- 📊 **Analytics Dashboard** - Visual charts and access statistics
- 🏢 **Access Zones** - Manage different access areas
- 📝 **Access Logs** - Track all access attempts and results
- 🎨 **Modern UI** - Beautiful, responsive interface with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Docker (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mind-access-control-v1
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend && pnpm install
   
   # Install backend dependencies
   cd ../backend && pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.local.example frontend/.env.local
   
   # Edit the file with your configuration
   # NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Start the development servers**
   ```bash
   # Start the backend (from the root directory)
   cd backend && pnpm run dev
   
   # Start the frontend (in a new terminal)
   cd frontend && pnpm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## Testing Camera Functionality

The camera functionality is now working! Here's how to test it:

1. **Navigate to the admin dashboard**
   - Go to http://localhost:3000
   - You'll be redirected to the admin login
   - Use any credentials (the system is in development mode)

2. **Test the camera**
   - In the admin dashboard, go to the "Access Control" tab
   - Click the "Open Camera" button
   - Allow camera permissions when prompted
   - Take a photo and confirm

3. **Alternative camera test page**
   - Visit http://localhost:3000/camera-test
   - This is a dedicated page for testing camera functionality

## Project Structure

```
mind-access-control-v1/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utility libraries
│   └── hooks/               # Custom React hooks
├── backend/                 # Node.js backend API
│   ├── src/                 # Source code
│   ├── supabase/            # Database migrations
│   └── services/            # Business logic services
└── scripts/                 # Development and deployment scripts
```

## Key Components

### Frontend
- **Admin Dashboard** (`/admin/dashboard`) - Main management interface
- **Camera Capture** (`components/camera-capture.tsx`) - Camera functionality
- **User Management** - Create and manage users
- **Analytics** - Charts and statistics

### Backend
- **Authentication Service** - JWT-based auth
- **User Management API** - CRUD operations for users
- **Access Control API** - Handle access requests
- **Database Migrations** - Supabase schema management

## Development

### Adding New Features

1. **Frontend Components**
   - Create components in `frontend/components/`
   - Use the existing UI component library
   - Follow the established patterns

2. **API Endpoints**
   - Add routes in `backend/src/routes/`
   - Create controllers in `backend/src/controllers/`
   - Update database schema if needed

3. **Database Changes**
   - Create migrations in `backend/supabase/migrations/`
   - Run migrations with the provided scripts

### Styling

The project uses:
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** components for consistent design
- **CSS Variables** for theming support

## Troubleshooting

### Common Issues

1. **Styles not loading**
   - Ensure Tailwind CSS is properly configured
   - Check that `globals.css` is imported in the layout
   - Verify all dependencies are installed

2. **Camera not working**
   - Check browser permissions
   - Ensure HTTPS in production (required for camera access)
   - Test on a supported browser (Chrome, Firefox, Safari)

3. **Backend connection issues**
   - Verify the backend is running on port 3001
   - Check environment variables
   - Ensure CORS is properly configured

### Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Verify all services are running
3. Check the network tab for API failures
4. Review the logs in the terminal

## License

This project is licensed under the MIT License.