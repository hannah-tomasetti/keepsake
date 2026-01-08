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
            modal.style.display = 'flex';
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
            modal.style.display = 'flex';
        }
    }

    // Close auth modal
    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
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
        event.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const { user } = await auth.signIn(email, password);
            this.closeAuthModal();
            this.showSuccess('Welcome back!');
        } catch (error) {
            console.error('Login error:', error);
            if (errorDiv) {
                errorDiv.textContent = error.message || 'Login failed. Please try again.';
                errorDiv.style.display = 'block';
            }
        }
    }

    // Handle signup
    async handleSignup(event) {
        event.preventDefault();

        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const errorDiv = document.getElementById('signupError');

        // Validate passwords match
        if (password !== confirmPassword) {
            if (errorDiv) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
            }
            return;
        }

        // Validate password strength
        if (password.length < 6) {
            if (errorDiv) {
                errorDiv.textContent = 'Password must be at least 6 characters';
                errorDiv.style.display = 'block';
            }
            return;
        }

        try {
            const { user } = await auth.signUp(email, password);
            this.closeAuthModal();
            this.showSuccess('Account created! Please check your email to verify your account.');
        } catch (error) {
            console.error('Signup error:', error);
            if (errorDiv) {
                errorDiv.textContent = error.message || 'Signup failed. Please try again.';
                errorDiv.style.display = 'block';
            }
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
        const loginBtn = document.getElementById('headerLoginBtn');
        const userMenu = document.getElementById('headerUserMenu');
        const userEmail = document.getElementById('headerUserEmail');

        if (user) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (userEmail) userEmail.textContent = user.email;

            // Update welcome screen
            this.updateWelcomeScreen(true);
        } else {
            // User is logged out
            if (loginBtn) loginBtn.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';

            // Update welcome screen
            this.updateWelcomeScreen(false);
        }
    }

    // Update welcome screen based on auth state
    updateWelcomeScreen(isLoggedIn) {
        const welcomeContent = document.querySelector('.welcome-content');
        if (!welcomeContent) return;

        const existingButtons = welcomeContent.querySelectorAll('.auth-button-group');
        existingButtons.forEach(btn => btn.remove());

        if (isLoggedIn) {
            // Show "My Projects" and "New Project" buttons
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'auth-button-group';
            buttonGroup.innerHTML = `
                <button class="btn-primary" onclick="authManager.goToMyProjects()">
                    My Projects
                </button>
                <button class="btn-secondary" onclick="app.goToProject()">
                    Create New Project
                </button>
            `;
            welcomeContent.querySelector('.tagline').after(buttonGroup);
        } else {
            // Show login/signup options
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'auth-button-group';
            buttonGroup.innerHTML = `
                <button class="btn-primary" onclick="app.goToProject()">
                    Try Keepsake
                </button>
                <div style="margin: 15px 0; color: #666; font-size: 14px;">
                    or
                </div>
                <button class="btn-secondary" onclick="authManager.showLogin()">
                    Login to Save Projects
                </button>
            `;
            welcomeContent.querySelector('.tagline').after(buttonGroup);
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
