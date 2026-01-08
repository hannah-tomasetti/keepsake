# Keepsake Database Schema Design

## Overview
This schema supports user authentication, project management, and multi-device access for the Keepsake carousel creator application.

## Database Tables

### 1. `users` (Handled by Supabase Auth)
Supabase provides built-in authentication with the following fields:
- `id` (UUID, primary key) - Auto-generated
- `email` (text, unique) - User's email address
- `encrypted_password` (text) - Bcrypt hashed password
- `email_confirmed_at` (timestamp) - Email verification timestamp
- `created_at` (timestamp) - Account creation date
- `updated_at` (timestamp) - Last update
- `last_sign_in_at` (timestamp) - Last login

### 2. `profiles` (Custom User Data)
Extended user information beyond auth:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Profiles are created automatically on signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 3. `projects`
Main project/keepsake data:

```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_type TEXT CHECK (content_type IN ('carousel', 'story')),
  aspect_ratio TEXT CHECK (aspect_ratio IN ('1:1', '4:5', '9:16')),
  num_slides INTEGER DEFAULT 1,
  thumbnail_url TEXT, -- URL to generated thumbnail for project list
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own projects
CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

### 4. `project_images`
Uploaded images for each project:

```sql
CREATE TABLE project_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  file_name TEXT NOT NULL,
  file_size INTEGER, -- In bytes
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_images_project_id ON project_images(project_id);

-- Enable Row Level Security
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

-- Users can view images for their projects
CREATE POLICY "Users can view own project images"
  ON project_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can insert images for their projects
CREATE POLICY "Users can insert own project images"
  ON project_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete images for their projects
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

### 5. `canvas_state`
JSON storage for canvas elements (images, text, shapes):

```sql
CREATE TABLE canvas_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  canvas_images JSONB DEFAULT '[]'::jsonb, -- Array of image elements
  canvas_texts JSONB DEFAULT '[]'::jsonb, -- Array of text elements
  canvas_shapes JSONB DEFAULT '[]'::jsonb, -- Array of shape elements
  canvas_dimensions JSONB, -- {width: 500, height: 500}
  version INTEGER DEFAULT 1, -- For optimistic locking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_canvas_state_project_id ON canvas_state(project_id);

-- Enable Row Level Security
ALTER TABLE canvas_state ENABLE ROW LEVEL SECURITY;

-- Users can view canvas state for their projects
CREATE POLICY "Users can view own canvas state"
  ON canvas_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = canvas_state.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can insert canvas state for their projects
CREATE POLICY "Users can insert own canvas state"
  ON canvas_state FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = canvas_state.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update canvas state for their projects
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

## Example JSON Structure for `canvas_state`

### `canvas_images` (JSONB Array):
```json
[
  {
    "id": "img-1704123456789",
    "src": "https://storage.supabase.co/...",
    "x": 100,
    "y": 50,
    "width": 300,
    "height": 200,
    "zIndex": 1,
    "locked": false,
    "crop": {
      "offsetX": 0,
      "offsetY": 0,
      "cropWidth": 300,
      "cropHeight": 200,
      "sourceWidth": 300,
      "sourceHeight": 200
    }
  }
]
```

### `canvas_texts` (JSONB Array):
```json
[
  {
    "id": "txt-1704123456789",
    "text": "My awesome caption",
    "x": 150,
    "y": 300,
    "font": "Poppins",
    "size": 24,
    "color": "#1a1a1a",
    "zIndex": 2
  }
]
```

### `canvas_shapes` (JSONB Array):
```json
[
  {
    "id": "shape-1704123456789",
    "type": "circle",
    "color": "#ff6b6b",
    "left": "200px",
    "top": "100px",
    "width": 100,
    "height": 100,
    "transform": "none",
    "zIndex": 3
  }
]
```

## Storage Buckets (Supabase Storage)

### `project-images` Bucket
Stores uploaded images for projects:
- Path structure: `{user_id}/{project_id}/{image_id}.{ext}`
- Public access: No (requires authentication)
- Max file size: 10MB
- Allowed mime types: image/jpeg, image/png, image/gif, image/webp

### `project-thumbnails` Bucket
Stores auto-generated thumbnails:
- Path structure: `{user_id}/{project_id}/thumbnail.jpg`
- Public access: No
- Auto-generated on project save

## Database Functions & Triggers

### Auto-update `updated_at` timestamp:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_state_updated_at
  BEFORE UPDATE ON canvas_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-create profile on signup:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1), -- Use email prefix as default username
    SPLIT_PART(NEW.email, '@', 1)  -- Use email prefix as default display name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Relationships

```
users (auth.users)
  ↓ (1:many)
projects
  ↓ (1:1)
canvas_state

projects
  ↓ (1:many)
project_images
```

## Migration Order

1. Create `profiles` table
2. Create `projects` table
3. Create `project_images` table
4. Create `canvas_state` table
5. Create storage buckets
6. Apply RLS policies
7. Create triggers and functions

## Future Enhancements (Optional)

### Collaboration (Phase 2):
```sql
CREATE TABLE project_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('viewer', 'editor', 'owner')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, user_id)
);
```

### Project Templates (Phase 2):
```sql
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  canvas_state JSONB,
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Usage Analytics (Phase 2):
```sql
CREATE TABLE user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  projects_created INTEGER DEFAULT 0,
  images_uploaded INTEGER DEFAULT 0,
  total_exports INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
