# Quick Supabase Setup - Copy & Paste Guide

## What You're Doing

You're creating 4 database tables so your app can save user projects.

## Direct Link to Your SQL Editor

**Click this link:** https://supabase.com/dashboard/project/bdhdmprxywywzzlnotdn/sql/new

This takes you directly to a new SQL query in your project.

## What to Do

1. Click the link above
2. Copy EVERYTHING below (from "-- Keepsake Database Setup" to the very end)
3. Paste it into the Supabase SQL editor
4. Click the green "RUN" button
5. Wait for "Success. No rows returned" message

---

## Copy From Here ⬇️

```sql
-- Keepsake Database Setup
-- Copy and paste this entire script into Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
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
CREATE TABLE IF NOT EXISTS projects (
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

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

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
CREATE TABLE IF NOT EXISTS project_images (
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

CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);

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
CREATE TABLE IF NOT EXISTS canvas_state (
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

CREATE INDEX IF NOT EXISTS idx_canvas_state_project_id ON canvas_state(project_id);

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

-- 5. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_state_updated_at ON canvas_state;
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## How to Know It Worked

After clicking RUN, you should see:
- Green checkmark ✓
- Message: "Success. No rows returned"

Then check the **Table Editor** (left sidebar) and you should see:
- profiles
- projects
- project_images
- canvas_state

## What's Next

After the SQL runs successfully:

### Step 1: Create Storage Buckets

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Create bucket named: `project-images`
   - Make it **Public**
4. Click **New bucket** again
5. Create bucket named: `project-thumbnails`
   - Make it **Public**

### Step 2: Set Bucket Policies

For the `project-images` bucket:
1. Click the three dots (...) next to `project-images`
2. Click **Policies**
3. Click **New Policy**
4. Select **For full customization**
5. Paste this:

```sql
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

Repeat for `project-thumbnails` bucket (replace `'project-images'` with `'project-thumbnails'`).

## Done!

Your database is ready. You can now:
1. Deploy your app to Netlify/Vercel
2. Add the environment variables from `.env.local`
3. Test signup and saving projects
