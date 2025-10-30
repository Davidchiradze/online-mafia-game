# Online Mafia Game - Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Configuration

1. Go to [Supabase](https://supabase.com) and create a new project
2. Once your project is created, go to Settings > API
3. Copy your project URL and anon key
4. Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

1. In your Supabase project, go to SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Run the SQL script to create the necessary tables and policies

### 4. Authentication Setup

1. In Supabase, go to Authentication > Settings
2. Enable "Enable email confirmations" if you want email verification
3. Configure your site URL (e.g., `http://localhost:3000` for development)
4. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/lobby`

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication page
│   ├── lobby/             # Game lobby page
│   └── page.tsx           # Home page (redirects to auth)
├── components/             # React components
│   └── auth/              # Authentication components
└── lib/                    # Utility libraries
    └── supabase/          # Supabase client configurations
```

## Features Implemented

- ✅ User authentication (sign up/sign in)
- ✅ Modern, responsive UI with TailwindCSS
- ✅ Supabase integration with proper TypeScript types
- ✅ Database schema for Mafia game
- ✅ Row Level Security (RLS) policies
- ✅ Automatic profile creation on signup
- ✅ Protected routes and authentication flow

## Next Steps

After setting up authentication, the next features to implement are:

1. **Game Management**: Create and join games
2. **Real-time Updates**: Socket.IO integration
3. **Video Chat**: LiveKit integration
4. **Game Logic**: Mafia game state machine
5. **Redis Integration**: Real-time game state sync

## Troubleshooting

### Common Issues

1. **Environment Variables**: Make sure `.env.local` is created and contains the correct Supabase credentials
2. **Database Schema**: Ensure the SQL schema has been run in Supabase
3. **Authentication Policies**: Check that RLS policies are properly configured
4. **CORS Issues**: Verify redirect URLs are correctly set in Supabase

### Getting Help

If you encounter issues:

1. Check the browser console for errors
2. Verify Supabase project settings
3. Ensure all environment variables are set correctly
4. Check that the database schema has been applied
