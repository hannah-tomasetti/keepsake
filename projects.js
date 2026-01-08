// Projects Manager for Keepsake
// Handles project saving, loading, and management

import { db, isSupabaseConfigured } from './supabase-client.js';
import authManager from './auth.js';

class ProjectsManager {
    constructor(app) {
        this.app = app;
        this.currentProjectId = null;
        this.autosaveInterval = null;
        this.autosaveDelay = 30000; // 30 seconds
    }

    // Save current project
    async saveProject() {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - save skipped');
            this.showOfflineMessage();
            return;
        }

        if (!authManager.isAuthenticated()) {
            authManager.showLogin();
            return;
        }

        try {
            const projectData = this.getCurrentProjectData();

            if (this.currentProjectId) {
                // Update existing project
                await db.updateProject(this.currentProjectId, {
                    name: projectData.name,
                    description: projectData.description,
                    num_slides: projectData.num_slides,
                    last_opened_at: new Date().toISOString()
                });

                // Save canvas state
                await db.saveCanvasState(this.currentProjectId, {
                    canvasImages: this.app.canvasImages,
                    canvasTexts: this.app.canvasTexts,
                    canvasShapes: this.app.canvasShapes,
                    canvasDimensions: this.app.canvasDimensions
                });

                authManager.showSuccess('Project saved!');
            } else {
                // Create new project
                const project = await db.createProject({
                    name: projectData.name,
                    description: projectData.description,
                    content_type: this.app.contentType,
                    aspect_ratio: this.app.aspectRatio,
                    num_slides: projectData.num_slides
                });

                this.currentProjectId = project.id;

                // Save canvas state
                await db.saveCanvasState(project.id, {
                    canvasImages: this.app.canvasImages,
                    canvasTexts: this.app.canvasTexts,
                    canvasShapes: this.app.canvasShapes,
                    canvasDimensions: this.app.canvasDimensions
                });

                authManager.showSuccess('Project created!');
            }

            // Start autosave
            this.startAutosave();

        } catch (error) {
            console.error('Save error:', error);
            authManager.showError('Failed to save project: ' + error.message);
        }
    }

    // Load a project
    async loadProject(projectId) {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - load skipped');
            return;
        }

        if (!authManager.isAuthenticated()) {
            authManager.showLogin();
            return;
        }

        try {
            // Get project data
            const project = await db.getProject(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            // Get canvas state
            const canvasState = await db.getCanvasState(projectId);

            // Load into app
            this.app.projectName = project.name;
            this.app.projectDescription = project.description || '';
            this.app.contentType = project.content_type;
            this.app.aspectRatio = project.aspect_ratio;
            this.app.numSlides = project.num_slides;

            if (canvasState) {
                this.app.canvasImages = canvasState.canvas_images || [];
                this.app.canvasTexts = canvasState.canvas_texts || [];
                this.app.canvasShapes = canvasState.canvas_shapes || [];
                if (canvasState.canvas_dimensions) {
                    this.app.canvasDimensions = canvasState.canvas_dimensions;
                }
            }

            this.currentProjectId = projectId;

            // Update last opened
            await db.updateProject(projectId, {
                last_opened_at: new Date().toISOString()
            });

            // Go to canvas
            this.app.goToCanvas();

            // Start autosave
            this.startAutosave();

            authManager.showSuccess('Project loaded!');

        } catch (error) {
            console.error('Load error:', error);
            authManager.showError('Failed to load project: ' + error.message);
        }
    }

    // Delete a project
    async deleteProject(projectId) {
        if (!isSupabaseConfigured()) {
            return;
        }

        if (!authManager.isAuthenticated()) {
            authManager.showLogin();
            return;
        }

        if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
            return;
        }

        try {
            await db.deleteProject(projectId);
            authManager.showSuccess('Project deleted');

            // Refresh projects list if we're on that screen
            if (document.getElementById('myProjectsScreen')?.classList.contains('active')) {
                await this.showMyProjects();
            }

        } catch (error) {
            console.error('Delete error:', error);
            authManager.showError('Failed to delete project: ' + error.message);
        }
    }

    // Show my projects screen
    async showMyProjects() {
        if (!isSupabaseConfigured()) {
            this.showOfflineMessage();
            return;
        }

        if (!authManager.isAuthenticated()) {
            authManager.showLogin();
            return;
        }

        try {
            const projects = await db.getProjects();

            // Go to projects screen
            this.app.goToScreen('myProjects');

            // Render projects
            this.renderProjectsList(projects);

        } catch (error) {
            console.error('Load projects error:', error);
            authManager.showError('Failed to load projects: ' + error.message);
        }
    }

    // Render projects list
    renderProjectsList(projects) {
        const container = document.getElementById('projectsGrid');
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No projects yet</p>
                    <button class="btn-primary" onclick="app.goToProject()">
                        Create Your First Project
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-card-thumbnail">
                    ${project.thumbnail_url
                        ? `<img src="${project.thumbnail_url}" alt="${project.name}">`
                        : `<div class="project-card-placeholder">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="#ccc">
                                <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ccc" stroke-width="2" fill="none"/>
                            </svg>
                          </div>`
                    }
                </div>
                <div class="project-card-content">
                    <h3 class="project-card-title">${this.escapeHtml(project.name)}</h3>
                    <p class="project-card-meta">
                        ${project.aspect_ratio} • ${project.num_slides} slide${project.num_slides > 1 ? 's' : ''}
                    </p>
                    <p class="project-card-date">
                        ${this.formatDate(project.updated_at)}
                    </p>
                </div>
                <div class="project-card-actions">
                    <button class="project-card-btn" onclick="app.projectsManager.loadProject('${project.id}')" title="Open">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="project-card-btn danger" onclick="app.projectsManager.deleteProject('${project.id}')" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Get current project data
    getCurrentProjectData() {
        return {
            name: this.app.projectName || 'Untitled Project',
            description: this.app.projectDescription || '',
            content_type: this.app.contentType,
            aspect_ratio: this.app.aspectRatio,
            num_slides: this.app.numSlides
        };
    }

    // Start autosave
    startAutosave() {
        // Clear existing interval
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }

        // Start new interval
        this.autosaveInterval = setInterval(async () => {
            if (this.currentProjectId && authManager.isAuthenticated()) {
                try {
                    await this.saveProject();
                    console.log('Autosaved at', new Date().toLocaleTimeString());
                } catch (error) {
                    console.error('Autosave failed:', error);
                }
            }
        }, this.autosaveDelay);
    }

    // Stop autosave
    stopAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }
    }

    // Create new project (reset state)
    newProject() {
        this.currentProjectId = null;
        this.stopAutosave();
    }

    // Utility: Escape HTML
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Utility: Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    }

    // Show offline message
    showOfflineMessage() {
        authManager.showError('Save feature requires Supabase setup. See SUPABASE_SETUP.md for instructions.');
    }
}

export default ProjectsManager;
