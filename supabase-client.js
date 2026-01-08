// Supabase Client Configuration
// This file initializes the Supabase client for authentication and database operations

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Get environment variables (will be injected by Netlify/Vercel at build time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback for direct HTML usage (development)
const SUPABASE_URL = supabaseUrl || window.ENV?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = supabaseAnonKey || window.ENV?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase credentials not found. Authentication and save features will be disabled.');
    console.warn('To enable these features, please set up your Supabase project and add credentials.');
    console.warn('See SUPABASE_SETUP.md for instructions.');
}

// Create Supabase client
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    })
    : null;

// Auth Helper Functions
export const auth = {
    // Sign up new user
    async signUp(email, password) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    // Sign in existing user
    async signIn(email, password) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    // Sign out current user
    async signOut() {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Get current session
    async getSession() {
        if (!supabase) {
            return null;
        }

        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    // Get current user
    async getUser() {
        if (!supabase) {
            return null;
        }

        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
        if (!supabase) {
            return () => {}; // Return empty unsubscribe function
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
        return () => subscription.unsubscribe();
    },

    // Reset password
    async resetPassword(email) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
    }
};

// Database Helper Functions
export const db = {
    // Projects
    async createProject(projectData) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const user = await auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                user_id: user.id,
                ...projectData
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getProjects() {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getProject(projectId) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) throw error;
        return data;
    },

    async updateProject(projectId, updates) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteProject(projectId) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;
    },

    // Canvas State
    async saveCanvasState(projectId, canvasData) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase
            .from('canvas_state')
            .upsert({
                project_id: projectId,
                canvas_images: canvasData.canvasImages || [],
                canvas_texts: canvasData.canvasTexts || [],
                canvas_shapes: canvasData.canvasShapes || [],
                canvas_dimensions: canvasData.canvasDimensions || null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getCanvasState(projectId) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase
            .from('canvas_state')
            .select('*')
            .eq('project_id', projectId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data;
    },

    // Image Upload
    async uploadImage(projectId, file) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const user = await auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${projectId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('project-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('project-images')
            .getPublicUrl(filePath);

        // Save image metadata
        await supabase
            .from('project_images')
            .insert([{
                project_id: projectId,
                storage_path: filePath,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type
            }]);

        return publicUrl;
    },

    async getProjectImages(projectId) {
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await supabase
            .from('project_images')
            .select('*')
            .eq('project_id', projectId);

        if (error) throw error;
        return data || [];
    }
};

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return supabase !== null;
};

// Export for use in app
export default supabase;
