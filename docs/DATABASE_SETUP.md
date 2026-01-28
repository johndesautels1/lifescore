# LIFE SCORE Database Setup Guide

> **Time to Setup: 5-10 minutes**
> **Cost: FREE** (Supabase free tier)

This guide walks you through setting up the database for LIFE SCORE, enabling:
- User authentication (Email, Google, GitHub)
- Saved comparisons across devices
- Olivia conversation persistence
- Gamma report storage

---

## Why Supabase?

| Feature | Supabase | Firebase | PlanetScale |
|---------|----------|----------|-------------|
| **Auth Built-in** | ✅ Yes | ✅ Yes | ❌ No |
| **PostgreSQL** | ✅ Yes | ❌ No (NoSQL) | ❌ MySQL |
| **Free Tier** | 500MB, 50k MAU | Limited | Limited |
| **Works with Capacitor** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Row Level Security** | ✅ Yes | ✅ Yes | ❌ No |
| **Real-time** | ✅ Yes | ✅ Yes | ❌ No |
| **Complexity** | 🟢 Easy | 🟡 Medium | 🟡 Medium |

---

## Quick Start (5 Minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project** (sign in with GitHub)
3. Click **New Project**
4. Fill in:
   - **Name**: `lifescore`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **Create new project**
6. Wait 2 minutes for setup

### Step 2: Get Your Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key**: `eyJhbGci...`

### Step 3: Add to Your .env

```bash
# In your project root, create .env (or add to existing)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

### Step 5: Enable Auth Providers (Optional)

For Google/GitHub login:

1. Go to **Authentication** → **Providers**
2. Enable **Google**:
   - Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add your Supabase callback URL: `https://your-project.supabase.co/auth/v1/callback`
3. Enable **GitHub**:
   - Create OAuth app at [GitHub Developer Settings](https://github.com/settings/developers)
   - Callback URL: `https://your-project.supabase.co/auth/v1/callback`

### Step 6: Deploy to Vercel

Add environment variables in Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Redeploy

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LIFE SCORE DATABASE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  auth.users (Supabase managed)                                              │
│       │                                                                      │
│       │ 1:1                                                                  │
│       ▼                                                                      │
│  ┌─────────────┐                                                            │
│  │  profiles   │ ← User profile & settings                                  │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         │ 1:N                                                                │
│         ▼                                                                    │
│  ┌─────────────────┐     1:N     ┌─────────────────────┐                   │
│  │  comparisons    │────────────►│  olivia_conversations│                   │
│  │                 │             │                       │                   │
│  │  - city1/city2  │             │  - openai_thread_id  │                   │
│  │  - scores       │             │  - message_count     │                   │
│  │  - full JSON    │             └───────────┬───────────┘                   │
│  └────────┬────────┘                         │                               │
│           │                                  │ 1:N                           │
│           │ 1:N                              ▼                               │
│           ▼                         ┌─────────────────┐                     │
│  ┌─────────────────┐                │ olivia_messages │                     │
│  │  gamma_reports  │                │                 │                     │
│  │                 │                │  - role         │                     │
│  │  - gamma_url    │                │  - content      │                     │
│  │  - pdf_url      │                │  - audio_url    │                     │
│  └─────────────────┘                └─────────────────┘                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profile data | `full_name`, `avatar_url`, `tier` |
| `comparisons` | Saved city comparisons | `city1_name`, `city2_name`, `comparison_result` (JSON) |
| `olivia_conversations` | Chat threads with Olivia | `openai_thread_id`, `comparison_id` |
| `olivia_messages` | Individual chat messages | `role`, `content`, `audio_url` |
| `gamma_reports` | Visual presentations | `gamma_url`, `pdf_url`, `pptx_url` |
| `user_preferences` | UI/feature settings | `theme`, `olivia_auto_speak` |

---

## Code Usage

### Authentication

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    signInWithEmail,
    signInWithGoogle,
    signOut
  } = useAuth();

  // Sign in
  const handleLogin = async () => {
    const { error } = await signInWithEmail('user@example.com', 'password');
    if (error) console.error(error);
  };

  // Google OAuth
  const handleGoogleLogin = async () => {
    await signInWithGoogle();
    // User will be redirected to Google
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}!</p>
      ) : (
        <button onClick={handleLogin}>Sign In</button>
      )}
    </div>
  );
}
```

### Saving Comparisons

```tsx
import { saveComparison, getUserComparisons } from './services/databaseService';
import { useAuth } from './contexts/AuthContext';

function ComparisonManager() {
  const { user } = useAuth();

  // Save a comparison
  const handleSave = async (comparisonResult) => {
    if (!user) return;

    const { data, error } = await saveComparison(
      user.id,
      comparisonResult,
      'My Austin vs Denver comparison'
    );

    if (error) {
      console.error('Save failed:', error);
    } else {
      console.log('Saved:', data);
    }
  };

  // Load user's comparisons
  const loadComparisons = async () => {
    if (!user) return;

    const { data, error } = await getUserComparisons(user.id, {
      limit: 10,
      favoritesOnly: false
    });

    return data;
  };
}
```

### Olivia Conversations

```tsx
import {
  findConversationForComparison,
  createOliviaConversation,
  addOliviaMessage
} from './services/databaseService';

// Resume or create conversation for a comparison
async function getOrCreateConversation(userId, comparisonId, openaiThreadId) {
  // Check for existing conversation
  const { data: existing } = await findConversationForComparison(
    userId,
    comparisonId
  );

  if (existing) {
    return existing; // Resume existing conversation
  }

  // Create new conversation
  const { data: newConv } = await createOliviaConversation(
    userId,
    openaiThreadId,
    comparisonId,
    'Chat about Austin vs Denver'
  );

  return newConv;
}

// Save a message
async function saveMessage(conversationId, role, content) {
  await addOliviaMessage(conversationId, role, content);
}
```

---

## Capacitor (Mobile App)

Supabase works out of the box with Capacitor. The `@supabase/supabase-js` client uses `localStorage` which Capacitor supports.

For OAuth redirects on mobile, add to your `capacitor.config.ts`:

```ts
const config: CapacitorConfig = {
  // ...
  server: {
    // Handle OAuth callbacks
    url: 'https://your-app.vercel.app',
    cleartext: false
  }
};
```

And handle deep links in your app for OAuth callbacks.

---

## Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data:

```sql
-- Example: Users can only see their own comparisons
CREATE POLICY "Users can view own comparisons"
  ON public.comparisons FOR SELECT
  USING (auth.uid() = user_id);
```

This means:
- ✅ User A can see User A's comparisons
- ❌ User A cannot see User B's comparisons
- ✅ All queries are automatically filtered

---

## Troubleshooting

### "Database not configured" Error

**Cause**: Missing environment variables

**Fix**:
```bash
# Check your .env file has:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### "Permission denied" Error

**Cause**: RLS policy blocking access

**Fix**:
1. Check you're logged in (`useAuth().isAuthenticated`)
2. Check user ID matches the data's `user_id`
3. Verify RLS policies in Supabase dashboard

### OAuth Not Working

**Cause**: Callback URL mismatch

**Fix**:
1. In Supabase → Authentication → URL Configuration
2. Add your site URL to **Redirect URLs**:
   - `http://localhost:5173/auth/callback`
   - `https://your-app.vercel.app/auth/callback`

### Data Not Syncing

**Cause**: Using demo mode instead of Supabase

**Fix**:
1. Check `isSupabaseConfigured()` returns `true`
2. Verify env vars are loaded (check Network tab in browser)
3. Make sure you're not using `lifescore` as password (demo mode)

---

## Migration from localStorage

If you have existing users with localStorage data:

```tsx
import { syncLocalToDatabase } from './services/databaseService';
import { getLocalEnhancedComparisons } from './services/savedComparisons';

async function migrateLocalData(userId: string) {
  const localData = getLocalEnhancedComparisons();

  const { synced, errors } = await syncLocalToDatabase(
    userId,
    localData.map(d => ({ result: d.result, nickname: d.nickname }))
  );

  console.log(`Migrated ${synced} comparisons (${errors} errors)`);

  // Optionally clear localStorage after successful migration
  if (errors === 0) {
    localStorage.removeItem('lifescore_saved_enhanced');
  }
}
```

---

## Cost Estimation

| Usage Level | Monthly Cost |
|-------------|--------------|
| **Free Tier** (< 500MB, < 50k MAU) | **$0** |
| Small (1GB, 100k MAU) | ~$25 |
| Medium (10GB, 500k MAU) | ~$75 |
| Large (100GB, 2M MAU) | ~$500 |

For most LIFE SCORE deployments, the free tier is sufficient.

---

## Files Created

```
D:\LifeScore\
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema
├── src/
│   ├── lib/
│   │   └── supabase.ts               # Supabase client
│   ├── types/
│   │   └── database.ts               # TypeScript types
│   ├── contexts/
│   │   └── AuthContext.tsx           # Auth provider (updated)
│   └── services/
│       └── databaseService.ts        # Database operations
├── .env.example                      # Environment template
└── DATABASE_SETUP.md                 # This guide
```

---

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run migration SQL
3. ✅ Add env vars to `.env` and Vercel
4. 🔲 Enable Google/GitHub OAuth (optional)
5. 🔲 Test authentication flow
6. 🔲 Migrate existing localStorage data

---

**Questions?** Check the [Supabase Docs](https://supabase.com/docs) or open an issue.
