# Supabase Setup Troubleshooting Guide

## Error: "syntax error at or near 'ready'"

This error typically happens when:
1. Wrong content was pasted into the SQL Editor
2. You're in the wrong section of Supabase
3. Extra text was included accidentally

## Step-by-Step Fix

### Step 1: Navigate to the Correct Location

1. Go to: https://supabase.com/dashboard/project/bdhdmprxywywzzlnotdn
2. On the left sidebar, click on **SQL Editor** (icon looks like `</>`)
3. Click the **+ New query** button in the top-left

### Step 2: Copy the SQL Migration Script

The SQL migration file is located at: `supabase-migration.sql`

**IMPORTANT**: You need to copy lines 1-203 of the file. The file contains valid SQL and comments (lines starting with `--`).

### Step 3: Paste and Run

1. **Clear the SQL Editor** - Make sure it's completely empty
2. **Paste the entire contents** of supabase-migration.sql
3. **DO NOT** type anything else
4. Click the green **RUN** button (bottom-right corner)

### Expected Result

You should see:
```
Success. No rows returned
```

This is correct! The tables are created but contain no data yet.

## Alternative: Run SQL in Sections

If you're still having trouble, try running the SQL in smaller sections:

### Section 1: Create Profiles Table

```sql
-- Create profiles table
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
```

### Section 2: Create Projects Table

```sql
-- Create projects table
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
```

### Section 3: Create Project Images Table

```sql
-- Create project_images table
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
```

### Section 4: Create Canvas State Table

```sql
-- Create canvas_state table
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
```

### Section 5: Create Triggers

```sql
-- Create triggers for updated_at
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
```

### Section 6: Auto-Create Profile Function

```sql
-- Auto-create profile on signup
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

## Verify Setup

After running all sections (or the full migration), verify your tables were created:

1. Click on **Table Editor** in the left sidebar
2. You should see these tables:
   - profiles
   - projects
   - project_images
   - canvas_state

## Next Steps

Once the SQL migration is complete:

1. **Create Storage Buckets** (see SUPABASE_SETUP.md step 3)
2. **Add environment variables to Netlify**
3. **Test the authentication flow**

## Still Having Issues?

Check that:
- You're logged into the correct Supabase account
- You have the correct project ID: `bdhdmprxywywzzlnotdn`
- You're in the SQL Editor (not API Docs or other sections)
- Your browser isn't blocking JavaScript
- You have internet connectivity
