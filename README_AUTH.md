# Keepsake Authentication & Save Features - Implementation Guide

## 🎉 What's Been Created

You now have a complete authentication and project management system ready to integrate!

### Files Created:
1. **`DATABASE_SCHEMA.md`** - Complete database design
2. **`SUPABASE_SETUP.md`** - Step-by-step Supabase configuration guide
3. **`supabase-client.js`** - Supabase client with helper functions
4. **`auth.js`** - Authentication UI and logic
5. **`projects.js`** - Project save/load functionality
6. **`.env.example`** - Environment variables template
7. **`.gitignore`** - Updated to exclude environment files

## 🚀 Quick Start - Link Your Supabase Project

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) in the left sidebar
3. Click **API** in the Settings menu
4. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key (the long string under "Project API keys")

### Step 2: Create Environment File

Create a file called `.env.local` in your keepsake folder:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace** the values with your actual Supabase URL and anon key from Step 1.

### Step 3: Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Open `DATABASE_SCHEMA.md` (I created this file)
3. Copy the complete SQL migration script (starts around line 65)
4. Paste it into the Supabase SQL Editor
5. Click **RUN**

This creates all the tables and security policies you need!

### Step 4: Create Storage Buckets

1. In Supabase, go to **Storage** in the left sidebar
2. Click **New bucket**
3. Create bucket named `project-images`:
   - Public: OFF
   - File size limit: 10 MB
   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
4. Create bucket named `project-thumbnails`:
   - Public: OFF
   - File size limit: 2 MB
   - Allowed MIME types: image/jpeg, image/png

### Step 5: Add to Your HTML

Add these scripts to the **bottom** of `index.html`, just before `</body>`:

```html
<!-- Supabase Integration -->
<script type="module">
    // Import Supabase client and auth
    import './supabase-client.js';
    import authManager from './auth.js';
    import ProjectsManager from './projects.js';

    // Initialize projects manager
    window.app.projectsManager = new ProjectsManager(window.app);

    // Make auth manager globally available
    window.authManager = authManager;
</script>
```

### Step 6: Add Auth UI to HTML

Add this authentication modal before the closing `</body>` tag in `index.html`:

```html
<!-- Authentication Modal -->
<div id="authModal" class="auth-modal" style="display: none;" onclick="if(event.target === this) authManager.closeAuthModal()">
    <div class="auth-container">
        <!-- Login Form -->
        <div id="loginForm" class="auth-form" style="display: block;">
            <div class="auth-header">
                <svg class="auth-logo-icon" viewBox="0 0 24 24" fill="#1a1a1a">
                    <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                </svg>
                <h2>Welcome Back</h2>
                <p>Log in to access your saved projects</p>
            </div>

            <form onsubmit="authManager.handleLogin(event); return false;">
                <div class="form-group">
                    <label for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" required placeholder="you@example.com">
                </div>

                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" required placeholder="••••••••">
                </div>

                <div id="loginError" class="auth-error" style="display: none;"></div>

                <button type="submit" class="btn-auth-primary">Log In</button>
            </form>

            <div class="auth-footer">
                <p>Don't have an account? <a href="#" onclick="authManager.toggleAuthMode(); return false;">Sign up</a></p>
            </div>
        </div>

        <!-- Signup Form -->
        <div id="signupForm" class="auth-form" style="display: none;">
            <div class="auth-header">
                <svg class="auth-logo-icon" viewBox="0 0 24 24" fill="#1a1a1a">
                    <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                </svg>
                <h2>Create Account</h2>
                <p>Sign up to save and access your projects</p>
            </div>

            <form onsubmit="authManager.handleSignup(event); return false;">
                <div class="form-group">
                    <label for="signupEmail">Email</label>
                    <input type="email" id="signupEmail" required placeholder="you@example.com">
                </div>

                <div class="form-group">
                    <label for="signupPassword">Password</label>
                    <input type="password" id="signupPassword" required placeholder="••••••••" minlength="6">
                </div>

                <div class="form-group">
                    <label for="signupConfirmPassword">Confirm Password</label>
                    <input type="password" id="signupConfirmPassword" required placeholder="••••••••" minlength="6">
                </div>

                <div id="signupError" class="auth-error" style="display: none;"></div>

                <button type="submit" class="btn-auth-primary">Create Account</button>
            </form>

            <div class="auth-footer">
                <p>Already have an account? <a href="#" onclick="authManager.toggleAuthMode(); return false;">Log in</a></p>
            </div>
        </div>

        <button class="auth-close" onclick="authManager.closeAuthModal()">×</button>
    </div>
</div>

<!-- My Projects Screen -->
<div class="screen" id="myProjectsScreen">
    <div class="projects-header">
        <button class="btn-back" onclick="app.goToWelcome()">← Back</button>
        <h2>My Projects</h2>
        <button class="btn-primary" onclick="app.goToProject()">+ New Project</button>
    </div>
    <div class="projects-grid" id="projectsGrid">
        <!-- Projects will be rendered here -->
    </div>
</div>
```

### Step 7: Add Auth CSS

Add this CSS to your `<style>` section in `index.html`:

```css
/* Authentication Modal */
.auth-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.auth-container {
    background: white;
    border-radius: 16px;
    padding: 40px;
    max-width: 440px;
    width: 90%;
    position: relative;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-header {
    text-align: center;
    margin-bottom: 30px;
}

.auth-logo-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
}

.auth-header h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #1a1a1a;
}

.auth-header p {
    color: #666;
    font-size: 14px;
    margin: 0;
}

.auth-form .form-group {
    margin-bottom: 20px;
}

.auth-form label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 8px;
}

.auth-form input {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-family: 'Poppins', sans-serif;
    transition: border-color 0.2s;
}

.auth-form input:focus {
    outline: none;
    border-color: #1a1a1a;
}

.btn-auth-primary {
    width: 100%;
    padding: 14px;
    background: #1a1a1a;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: all 0.2s;
    margin-top: 10px;
}

.btn-auth-primary:hover {
    background: #333;
    transform: translateY(-2px);
}

.auth-footer {
    text-align: center;
    margin-top: 24px;
    font-size: 14px;
    color: #666;
}

.auth-footer a {
    color: #1a1a1a;
    font-weight: 600;
    text-decoration: none;
}

.auth-footer a:hover {
    text-decoration: underline;
}

.auth-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 32px;
    color: #666;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: background 0.2s;
}

.auth-close:hover {
    background: #f5f5f5;
}

.auth-error {
    background: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
}

/* My Projects Screen */
#myProjectsScreen {
    padding: 40px;
    background: #f5f5f5;
}

.projects-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.projects-header h2 {
    font-size: 32px;
    font-weight: 600;
    margin: 0;
}

.projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
}

.project-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.project-card-thumbnail {
    width: 100%;
    height: 200px;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
}

.project-card-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.project-card-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
}

.project-card-content {
    padding: 16px;
}

.project-card-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.project-card-meta {
    font-size: 14px;
    color: #666;
    margin: 0 0 4px 0;
}

.project-card-date {
    font-size: 12px;
    color: #999;
    margin: 0;
}

.project-card-actions {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
}

.project-card-btn {
    flex: 1;
    padding: 8px;
    background: #f5f5f5;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.project-card-btn:hover {
    background: #e0e0e0;
}

.project-card-btn.danger:hover {
    background: #ffebee;
    color: #c62828;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
}

.empty-state p {
    font-size: 18px;
    margin-bottom: 24px;
}

/* Toast Animations */
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

/* Auth button group */
.auth-button-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 24px;
}

.btn-secondary {
    background: white;
    color: #1a1a1a;
    border: 2px solid #1a1a1a;
}

.btn-secondary:hover {
    background: #1a1a1a;
    color: white;
}
```

### Step 8: Add Save Button to Canvas

In your canvas header (where Undo/Redo/Export buttons are), add a Save button:

Find this section in `index.html`:
```html
<div class="canvas-actions">
    <button class="btn-history" id="btnUndo" onclick="app.undo()" title="Undo">
```

Add a save button before the export button:
```html
<button class="btn-save" onclick="app.projectsManager.saveProject()" title="Save Project">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
    Save
</button>
```

Add this CSS for the save button:
```css
.btn-save {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: all 0.2s;
}

.btn-save:hover {
    background: #45a049;
    transform: translateY(-2px);
}

.btn-save:active {
    transform: scale(0.95);
}
```

## ✅ Test Your Setup

1. **Test Signup:**
   - Open your app
   - Click "Login to Save Projects"
   - Switch to Sign Up
   - Create an account with your email

2. **Test Login:**
   - Log in with your credentials
   - You should see "My Projects" button

3. **Test Save:**
   - Create a new project
   - Add some images/text/shapes
   - Click the Save button
   - You should see "Project saved!" toast

4. **Test Load:**
   - Click "My Projects"
   - Click on a saved project
   - It should load with all your content!

## 🌐 Deploy to Netlify

1. Push your code to GitHub:
```bash
git add .
git commit -m "Add authentication and save features"
git push
```

2. In Netlify dashboard:
   - Go to **Site settings** → **Environment variables**
   - Add:
     - `VITE_SUPABASE_URL`: Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: Your anon key
   - Click **Save**

3. Trigger a new deploy

## 🔄 Switch to Vercel (Later)

When ready to switch:
1. Import your GitHub repo to Vercel
2. Add the same environment variables
3. Deploy!

Your Supabase database stays exactly the same - only hosting changes! 🎉

## 📝 Features You Now Have

✅ User signup and login
✅ Save projects to cloud
✅ Load saved projects
✅ Auto-save every 30 seconds
✅ Delete projects
✅ Multi-device access
✅ Secure with Row Level Security
✅ Project history tracking

## 🐛 Troubleshooting

**"Supabase not configured" error:**
- Check your `.env.local` file exists
- Make sure variable names match exactly
- Restart your dev server

**Can't log in:**
- Check Supabase SQL migrations ran successfully
- Verify email/password are correct
- Check Supabase Auth is enabled

**Save not working:**
- Make sure you're logged in
- Check browser console for errors
- Verify Supabase tables exist

**Images not uploading:**
- Check storage buckets are created
- Verify bucket policies are applied

## 🎊 You're All Set!

You now have a full-featured app with authentication and cloud storage! Users can save their work and access it from any device.

Need help? Check the browser console for errors or refer to `SUPABASE_SETUP.md` for detailed instructions.
