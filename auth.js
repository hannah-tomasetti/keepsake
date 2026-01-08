// Authentication Module for Keepsake
// Handles user authentication, session management, and UI

import { auth, isSupabaseConfigured } from './supabase-client.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authModal = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            console.log('Running in offline mode - authentication disabled');
            return;
        }

        // Check for existing session
        const session = await auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.onAuthStateChanged(this.currentUser);
        } else {
            // No session - show sign in button
            this.currentUser = null;
            this.onAuthStateChanged(null);
        }

        // Listen for auth state changes
        auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            this.currentUser = session?.user || null;
            this.onAuthStateChanged(this.currentUser);
        });

        this.initialized = true;
    }

    // Show login modal
    showLogin() {
        const modal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (modal && loginForm && signupForm) {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            modal.classList.add('active');

            // Close modal when clicking outside
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeAuthModal();
                }
            };
        }
    }

    // Show signup modal
    showSignup() {
        const modal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (modal && loginForm && signupForm) {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            modal.classList.add('active');

            // Close modal when clicking outside
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeAuthModal();
                }
            };
        }
    }

    // Close auth modal
    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Switch between login and signup
    toggleAuthMode() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (loginForm && signupForm) {
            const loginVisible = loginForm.style.display !== 'none';
            loginForm.style.display = loginVisible ? 'none' : 'block';
            signupForm.style.display = loginVisible ? 'block' : 'none';
        }
    }

    // Handle login
    async handleLogin(event) {
        if (event) event.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showError('Please enter email and password');
            return;
        }

        try {
            const { user } = await auth.signIn(email, password);
            this.closeAuthModal();
            this.showSuccess('Welcome back!');
            // Clear form
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'Login failed. Please try again.');
        }
    }

    // Handle signup
    async handleSignup(event) {
        if (event) event.preventDefault();

        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupPasswordConfirm').value;

        if (!email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        // Validate password strength
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }

        try {
            const { user } = await auth.signUp(email, password);
            this.closeAuthModal();
            this.showSuccess('Account created! Please check your email to verify your account.');
            // Clear form
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupPasswordConfirm').value = '';
        } catch (error) {
            console.error('Signup error:', error);
            this.showError(error.message || 'Signup failed. Please try again.');
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.showSuccess('Logged out successfully');
            // Redirect to welcome screen
            if (window.app) {
                window.app.goToWelcome();
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to log out. Please try again.');
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Require authentication (call before sensitive operations)
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.showLogin();
            throw new Error('Authentication required');
        }
        return true;
    }

    // Callback when auth state changes
    onAuthStateChanged(user) {
        // Update UI based on auth state
        const signInBtn = document.getElementById('signInBtn');
        const myProjectsBtn = document.getElementById('myProjectsBtn');
        const signOutBtn = document.getElementById('signOutBtn');
        const userWelcome = document.getElementById('userWelcome');
        const btnSave = document.getElementById('btnSave');

        if (user) {
            // User is logged in
            if (signInBtn) signInBtn.style.display = 'none';
            if (myProjectsBtn) myProjectsBtn.style.display = 'inline-block';
            if (signOutBtn) signOutBtn.style.display = 'inline-block';
            if (btnSave) btnSave.style.display = 'flex';

            if (userWelcome) {
                userWelcome.textContent = `Welcome back, ${user.email}`;
                userWelcome.style.display = 'block';
            }

            console.log('User logged in:', user.email);
        } else {
            // User is logged out
            if (signInBtn) signInBtn.style.display = 'inline-block';
            if (myProjectsBtn) myProjectsBtn.style.display = 'none';
            if (signOutBtn) signOutBtn.style.display = 'none';
            if (btnSave) btnSave.style.display = 'none';

            if (userWelcome) {
                userWelcome.style.display = 'none';
            }

            console.log('User logged out');
        }
    }

    // Navigate to my projects screen
    async goToMyProjects() {
        if (!this.isAuthenticated()) {
            this.showLogin();
            return;
        }

        if (window.app && window.app.projectsManager) {
            await window.app.projectsManager.showMyProjects();
        }
    }

    // Show success message
    showSuccess(message) {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification success';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Poppins', sans-serif;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Show error message
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Poppins', sans-serif;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => authManager.init());
} else {
    authManager.init();
}

// Export for use in other modules
export default authManager;

// Make available globally for onclick handlers
window.authManager = authManager;
