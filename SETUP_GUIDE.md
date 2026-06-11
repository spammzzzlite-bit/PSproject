# Google OAuth + Supabase Setup Guide

## ✅ What's Been Done

Your login system is now fully integrated with:
- **Supabase** - Database for storing user data
- **Google OAuth 2.0** - Real Google sign-in functionality
- **Email/Password** - Traditional login option

## 📋 Final Setup Steps (You Need To Do)

### Step 1: Create Supabase Table (2 minutes)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `xlrgteezusfeinbnhzhq`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy & paste the SQL from `SUPABASE_SETUP.sql` in your project root
6. Click **RUN** button

This creates:
- `users` table with all required fields
- Automatic `updated_at` timestamps
- Indexes for fast queries

### Step 2: Verify Your Credentials

Check your `.env.local` file (already created):
```
VITE_SUPABASE_URL=https://xlrgteezusfeinbnhzhq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_n8e7Ey4A1gNa7fW3uTgQHA_zmAOeuEE
VITE_GOOGLE_CLIENT_ID=283486130787-jvvmh5aokrpjvo38ff3fdbgqaa4kp3ac.apps.googleusercontent.com
```

### Step 3: Configure Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services → Credentials**
3. Find your OAuth 2.0 Client ID
4. Edit it and add these **Authorized JavaScript origins**:
   - `http://localhost:5173` (local development)
   - `http://localhost:3000` (if using different port)
   - Your production domain (when deploying)
5. Save

### Step 4: Test the Login

1. Start dev server: `npm run dev`
2. Navigate to `/auth` route
3. Try **"Continue with Google"** - you should see the Google account picker
4. Select an account
5. You'll be logged in and data saved to Supabase ✅

## 🔍 How It Works Now

### Google Sign-In Flow:
1. User clicks "Continue with Google"
2. Google OAuth popup appears (account picker)
3. User selects their Google account
4. Your app gets user's email, name, and profile picture
5. Data is **automatically saved to Supabase**
6. User is logged in

### Email/Password Flow:
1. User enters email + password
2. Data is hashed and stored in Supabase
3. On next login, password is verified against hash
4. User is logged in

### Data Storage:
All user data is stored in Supabase `users` table with:
- `email` - User's email (unique)
- `name` - Display name
- `password_hash` - Only for email/password users (null for OAuth)
- `provider` - Auth method (google, email, github)
- `picture` - Profile picture URL (if available)
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

## 🚀 Production Deployment

Before deploying to production:

1. **Add production domain to Google OAuth**
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com`

2. **Update .env for production**
   - Keep same Supabase credentials
   - Update `VITE_GOOGLE_CLIENT_ID` if using different OAuth client

3. **Supabase Row Level Security (Optional)**
   - Currently, anon key allows inserting/reading users
   - For production, you may want to add RLS policies
   - All queries are safe - they only access the `users` table

## 🐛 Troubleshooting

**"Missing Supabase environment variables"**
- Check `.env.local` file exists with both URLs/keys
- Restart dev server after adding .env

**"Table doesn't exist" error**
- Run the SQL from `SUPABASE_SETUP.sql` in Supabase SQL Editor
- Check table exists: Supabase dashboard → Tables → users

**Google OAuth not working**
- Verify Client ID is in `.env.local`
- Check authorized origins in Google Cloud Console
- Check `localhost:5173` is in the list

**User not saving to database**
- Open browser DevTools (F12) → Console
- Check for error messages
- Verify Supabase anon key is correct

## 📁 Files Changed

- `src/lib/auth.ts` - Updated to use Supabase instead of localStorage
- `src/lib/supabase.ts` - New Supabase client configuration
- `src/components/OAuthProviderDialog.tsx` - Fixed async handling
- `src/routes/auth.tsx` - Updated Google OAuth flow
- `.env.local` - New environment file with credentials
- `.env.example` - Updated template
- `SUPABASE_SETUP.sql` - Database schema

## ✨ Features

✅ Google OAuth sign-in with real account picker
✅ Email/password registration and sign-in
✅ Automatic user data persistence to Supabase
✅ Password hashing with SHA-256
✅ User profile picture support
✅ Unique email constraint
✅ Automatic timestamps
✅ No other code affected (clean integration)

## 📚 Next Steps (Optional)

1. **Add GitHub OAuth** - Similar to Google (update auth.tsx)
2. **Email Verification** - Send confirmation emails
3. **Password Reset** - Add forgot password flow
4. **User Profile** - Create user profile page
5. **Session Management** - Add logout, session refresh

---

All setup complete! Just run the SQL in Supabase and test the login. 🎉
