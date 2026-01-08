# Supabase Setup Guide for Keepsake

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: keepsake (or any name you prefer)
   - **Database Password**: (save this somewhere secure!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key (under "Project API keys")

## Step 3: Create the Database Tables

1. Go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy and paste the SQL from `DATABASE_SCHEMA.md`
4. Run each section in order:
   - First: Create `profiles` table
   - Second: Create `projects` table
   - Third: Create `project_images` table
   - Fourth: Create `canvas_state` table
   - Fifth: Create triggers and functions
5. Click **RUN** for each query

### Quick Migration Script:

```sql
-- 1. Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_type TEXT CHECK (content_type IN ('carousel', 'story')),
  aspect_ratio TEXT CHECK (aspect_ratio IN ('1:1', '4:5', '9:16')),
  num_slides INTEGER DEFAULT 1,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create project_images table
CREATE TABLE project_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_images_project_id ON project_images(project_id);

ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project images"
  ON project_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project images"
  ON project_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project images"
  ON project_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 4. Create canvas_state table
CREATE TABLE canvas_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  canvas_images JSONB DEFAULT '[]'::jsonb,
  canvas_texts JSONB DEFAULT '[]'::jsonb,
  canvas_shapes JSONB DEFAULT '[]'::jsonb,
  canvas_dimensions JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_canvas_state_project_id ON canvas_state(project_id);

ALTER TABLE canvas_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canvas state"
  ON canvas_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = canvas_state.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own canvas state"
  ON canvas_state FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = canvas_state.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own canvas state"
  ON canvas_state FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = canvas_state.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 5. Create triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_state_updated_at
  BEFORE UPDATE ON canvas_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 4: Create Storage Buckets

1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Create two buckets:

### Bucket 1: `project-images`
- **Name**: project-images
- **Public bucket**: OFF (unchecked)
- **File size limit**: 10 MB
- **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp

### Bucket 2: `project-thumbnails`
- **Name**: project-thumbnails
- **Public bucket**: OFF (unchecked)
- **File size limit**: 2 MB
- **Allowed MIME types**: image/jpeg, image/png

4. Set up bucket policies:

For each bucket, go to **Policies** tab and add:

```sql
-- Policy for project-images bucket
CREATE POLICY "Users can upload own project images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own project images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own project images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Same policies for project-thumbnails bucket
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own thumbnails"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 5: Configure Environment Variables

### For Local Development:
Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Netlify:
1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add these variables:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your anon key

### For Vercel (when you switch):
1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add the same variables as above
4. Check "Production", "Preview", and "Development"

## Step 6: Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase
2. **Email** should be enabled by default
3. Optional: Configure email templates under **Email Templates**
4. Optional: Set up SMTP for custom email domain (or use Supabase's default)

## Step 7: Test Your Setup

Run this in the Supabase SQL Editor to verify:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'projects', 'project_images', 'canvas_state');

-- Check if storage buckets exist
SELECT * FROM storage.buckets;
```

You should see all 4 tables and 2 buckets!

## Transferring from Netlify to Vercel

When you're ready to switch:

1. **Push your code to GitHub** (if not already)
2. **Go to Vercel** → New Project
3. **Import from GitHub** → Select your keepsake repo
4. **Add Environment Variables** (copy from Netlify):
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
5. **Deploy** → Done!

Your Supabase database stays the same - only the frontend hosting changes. No data migration needed! 🎉

## Next Steps

After setup is complete:
1. Test user signup/login
2. Create a test project and save it
3. Verify images upload correctly
4. Test loading saved projects

## Troubleshooting

### "relation does not exist" error
- Make sure you ran all SQL migrations in order
- Check that RLS is enabled on all tables

### Can't upload images
- Verify storage buckets are created
- Check bucket policies are applied
- Ensure file size is under 10MB

### Authentication not working
- Confirm environment variables are set correctly
- Check Supabase URL doesn't have trailing slash
- Verify anon key is the "anon public" key, not the service key

## Cost Estimate (Free Tier)

Supabase Free Tier includes:
- ✅ Unlimited API requests
- ✅ 500MB database storage
- ✅ 1GB file storage
- ✅ 50,000 monthly active users
- ✅ 2GB bandwidth

This should be more than enough to start! 🚀
