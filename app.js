const app = {
    currentScreen: 'welcome',
    contentType: null,  // 'carousel' or 'story'
    aspectRatio: null,
    imageLibrary: [],
    canvasImages: [],
    canvasTexts: [],
    selectedImageId: null,
    selectedTextId: null,
    cropMode: false,
    cropData: null,
    canvasDimensions: { width: 500, height: 500 },
    dragData: null,
    textDragData: null,
    resizeData: null,
    currentPreviewIndex: 0,
    projectName: '',
    projectDescription: '',
    numSlides: 1,
    selectedTool: null,

    // Shapes tool state
    canvasShapes: [],
    selectedShape: null, // current shape type to add
    selectedShapeId: null, // selected shape on canvas
    shapeColor: '#1a1a1a',
    shapeDragData: null,
    shapeResizeData: null,

    // Undo/Redo history
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,

    // Preview state
    currentPreviewSlide: 0,

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        const canvas = document.getElementById('canvas');

        canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        window.addEventListener('mouseup', () => this.handleCanvasMouseUp());

        canvas.addEventListener('touchstart', (e) => this.handleCanvasTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.handleCanvasTouchMove(e), { passive: false });
        window.addEventListener('touchend', () => this.handleCanvasTouchEnd());
    },

    goToScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const targetScreen = document.getElementById(screenName + 'Screen');
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    },

    goToWelcome() {
        this.goToScreen('welcome');
    },

    goToProject() {
        this.goToScreen('project');
    },

    updateProjectContinueButton() {
        const projectNameInput = document.getElementById('projectName');
        const continueBtn = document.getElementById('projectContinueBtn');

        // Enable button only if project name has content
        if (projectNameInput.value.trim().length > 0) {
            continueBtn.disabled = false;
        } else {
            continueBtn.disabled = true;
        }
    },

    saveProjectInfo() {
        const projectNameInput = document.getElementById('projectName');
        const projectDescInput = document.getElementById('projectDescription');

        this.projectName = projectNameInput.value.trim();
        this.projectDescription = projectDescInput.value.trim();

        if (this.projectName) {
            this.goToContentType();
        }
    },

    goToContentType() {
        this.goToScreen('contentType');
    },

    selectContentType(type) {
        this.contentType = type;

        if (type === 'story') {
            // Story type: automatically set 9:16 and skip aspect ratio selection
            this.aspectRatio = '9:16';
            this.calculateCanvasDimensions();
            this.goToScreen('select');
        } else {
            // Carousel type: go to aspect ratio selection
            this.goToAspectRatio();
        }
    },

    goToAspectRatio() {
        this.goToScreen('aspect');
    },

    selectAspectRatio(ratio) {
        this.aspectRatio = ratio;
        this.calculateCanvasDimensions();
        this.goToScreen('select');
    },

    calculateCanvasDimensions() {
        const baseHeight = 500;
        switch(this.aspectRatio) {
            case '1:1':
                this.canvasDimensions = { width: baseHeight, height: baseHeight };
                break;
            case '4:5':
                this.canvasDimensions = { width: baseHeight * 0.8, height: baseHeight };
                break;
            case '9:16':
                this.canvasDimensions = { width: baseHeight * 0.5625, height: baseHeight };
                break;
        }
    },

    handleImageSelect(event) {
        const files = Array.from(event.target.files);

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const newImage = {
                        id: Date.now() + Math.random(),
                        src: e.target.result
                    };
                    this.imageLibrary.push(newImage);
                    this.updateImageGrid();
                };
                reader.readAsDataURL(file);
            }
        });
    },

    updateImageGrid() {
        const grid = document.getElementById('imageGrid');
        const gridWrapper = document.getElementById('imageGridWrapper');
        const uploadArea = document.getElementById('uploadArea');
        const actions = document.getElementById('selectActions');
        const backBtn = document.getElementById('selectBackBtn');

        if (this.imageLibrary.length > 0) {
            uploadArea.classList.add('hidden');
            gridWrapper.style.display = 'block';
            actions.style.display = 'flex';
            backBtn.style.display = 'none';

            grid.innerHTML = this.imageLibrary.map(img => `
                <div class="image-thumb" data-image-id="${img.id}">
                    <img src="${img.src}" alt="Selected image" onclick="app.openImagePreview('${img.src}', event)">
                    <button class="image-remove-btn" onclick="event.stopPropagation(); app.removeImage('${img.id}', event);">&times;</button>
                </div>
            `).join('');
        } else {
            uploadArea.classList.remove('hidden');
            gridWrapper.style.display = 'none';
            actions.style.display = 'none';
            backBtn.style.display = 'block';
        }
    },

    openImagePreview(imageSrc, event) {
        if (event) event.stopPropagation();

        // Find the index of this image in the library
        const index = this.imageLibrary.findIndex(img => img.src === imageSrc);
        this.currentPreviewIndex = index;

        const modal = document.getElementById('imagePreviewModal');
        const previewImg = document.getElementById('previewImage');
        previewImg.src = imageSrc;
        modal.classList.add('active');

        this.updatePreviewNavButtons();
    },

    navigatePreview(direction, event) {
        if (event) event.stopPropagation();

        const newIndex = this.currentPreviewIndex + direction;

        // Check bounds
        if (newIndex < 0 || newIndex >= this.imageLibrary.length) {
            return;
        }

        this.currentPreviewIndex = newIndex;
        const previewImg = document.getElementById('previewImage');
        previewImg.src = this.imageLibrary[this.currentPreviewIndex].src;

        this.updatePreviewNavButtons();
    },

    updatePreviewNavButtons() {
        const leftBtn = document.getElementById('previewNavLeft');
        const rightBtn = document.getElementById('previewNavRight');

        // Hide left arrow if at first image
        if (this.currentPreviewIndex === 0) {
            leftBtn.classList.add('hidden');
        } else {
            leftBtn.classList.remove('hidden');
        }

        // Hide right arrow if at last image
        if (this.currentPreviewIndex === this.imageLibrary.length - 1) {
            rightBtn.classList.add('hidden');
        } else {
            rightBtn.classList.remove('hidden');
        }
    },

    closeImagePreview() {
        const modal = document.getElementById('imagePreviewModal');
        modal.classList.remove('active');
    },

    removeImage(imageId, event) {
        if (event) event.stopPropagation();
        this.imageLibrary = this.imageLibrary.filter(img => img.id != imageId);
        this.updateImageGrid();
    },

    goToImageSelect() {
        this.goToScreen('select');
    },

    goToCanvas() {
        this.setupCanvas();
        this.goToScreen('canvas');
    },

    setupCanvas() {
        const canvas = document.getElementById('canvas');
        const totalWidth = this.canvasDimensions.width * this.numSlides;

        canvas.style.width = totalWidth + 'px';
        canvas.style.height = this.canvasDimensions.height + 'px';

        // Clear canvas
        canvas.innerHTML = '';

        for (let i = 1; i < this.numSlides; i++) {
            const line = document.createElement('div');
            line.className = 'splice-line';
            line.style.left = (i * this.canvasDimensions.width) + 'px';
            canvas.appendChild(line);
        }

        // Position the add slide button at the far right edge
        const addButton = document.querySelector('.btn-add-slide');
        if (addButton) {
            addButton.style.left = (totalWidth + 10) + 'px';
        }

        // Update canvas title with project name
        document.getElementById('canvasTitle').textContent = this.projectName || 'Keepsake Canvas';

        document.getElementById('canvasInfo').textContent =
            `${this.aspectRatio} • ${this.numSlides} slide${this.numSlides > 1 ? 's' : ''}`;

        this.updateLibraryGrid();
        document.getElementById('libraryCount').textContent = this.imageLibrary.length;

        this.renderCanvasImages();

        // Save initial state for undo/redo
        this.saveState();
    },

    addSlide() {
        this.numSlides++;
        const canvas = document.getElementById('canvas');
        const totalWidth = this.canvasDimensions.width * this.numSlides;

        // Update canvas width
        canvas.style.width = totalWidth + 'px';

        // Update drawing canvas width
        if (this.drawingCanvas) {
            this.drawingCanvas.width = totalWidth;
            this.drawingCanvas.style.width = totalWidth + 'px';
        }

        // Add new splice line
        const line = document.createElement('div');
        line.className = 'splice-line';
        line.style.left = ((this.numSlides - 1) * this.canvasDimensions.width) + 'px';
        canvas.appendChild(line);

        // Reposition the plus button to the new far right edge
        const addButton = document.querySelector('.btn-add-slide');
        addButton.style.left = (totalWidth + 10) + 'px';

        this.saveState();

        // Update info text
        document.getElementById('canvasInfo').textContent =
            `${this.aspectRatio} • ${this.numSlides} slide${this.numSlides > 1 ? 's' : ''}`;

        // Scroll to show the new slide
        const scrollContainer = document.querySelector('.canvas-scroll');
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
    },

    openToolPanel(toolName) {
        // Update active button
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-tool="${toolName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Show corresponding panel
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const activePanel = document.getElementById(`panel-${toolName}`);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        this.selectedTool = toolName;
    },

    updateLibraryGrid() {
        const grid = document.getElementById('libraryGrid');
        grid.innerHTML = this.imageLibrary.map(img => `
            <div class="library-item" onclick="app.addImageToCanvas('${img.id}')">
                <img src="${img.src}" alt="Library image">
            </div>
        `).join('');
    },

    addMoreImagesToLibrary(event) {
        const files = Array.from(event.target.files);

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const newImage = {
                        id: Date.now() + Math.random(),
                        src: e.target.result
                    };
                    this.imageLibrary.push(newImage);
                    this.updateLibraryGrid();
                    document.getElementById('libraryCount').textContent = this.imageLibrary.length;
                };
                reader.readAsDataURL(file);
            }
        });

        // Reset input so same file can be selected again
        event.target.value = '';
    },

    getCurrentSlideIndex() {
        const scrollContainer = document.querySelector('.canvas-scroll');
        if (!scrollContainer) return 0;

        const scrollLeft = scrollContainer.scrollLeft;
        const slideWidth = this.canvasDimensions.width;

        // Round to nearest slide instead of floor to get the most centered slide
        const slideIndex = Math.round(scrollLeft / slideWidth);

        // Ensure we don't go beyond the number of slides
        return Math.min(slideIndex, this.numSlides - 1);
    },

    addImageToCanvas(imageId) {
        const libraryImage = this.imageLibrary.find(img => img.id == imageId);
        if (!libraryImage) return;

        // Get the current slide being viewed
        const currentSlideIndex = this.getCurrentSlideIndex();

        // Calculate x position relative to the current slide
        const slideOffsetX = currentSlideIndex * this.canvasDimensions.width;
        const xPositionOnSlide = 50; // Position from left edge of current slide
        const absoluteX = slideOffsetX + xPositionOnSlide;

        // Load the image to get its actual dimensions
        const img = new Image();
        img.onload = () => {
            // Use original dimensions, but scale down if too large
            let width = img.naturalWidth;
            let height = img.naturalHeight;

            // Scale down if larger than canvas dimensions
            const maxSize = Math.min(this.canvasDimensions.width * 0.8, 400);
            if (width > maxSize || height > maxSize) {
                const scale = Math.min(maxSize / width, maxSize / height);
                width = width * scale;
                height = height * scale;
            }

            const newCanvasImage = {
                id: Date.now() + Math.random(),
                src: libraryImage.src,
                x: absoluteX,
                y: 50,
                width: width,
                height: height,
                locked: false,
                zIndex: this.canvasImages.length
            };

            this.canvasImages.push(newCanvasImage);
            this.renderCanvasImages();
            this.saveState();
        };
        img.src = libraryImage.src;
    },

    addTextToCanvas() {
        // Get the current slide being viewed
        const currentSlideIndex = this.getCurrentSlideIndex();

        // Calculate x position relative to the current slide
        const slideOffsetX = currentSlideIndex * this.canvasDimensions.width;
        const xPositionOnSlide = 50;
        const absoluteX = slideOffsetX + xPositionOnSlide;

        const newText = {
            id: Date.now() + Math.random(),
            text: 'Click to edit',
            x: absoluteX,
            y: 100,
            font: 'Poppins',
            size: 18,
            color: '#1a1a1a',
            zIndex: this.canvasImages.length + this.canvasTexts.length
        };

        this.canvasTexts.push(newText);
        this.selectedTextId = newText.id;
        this.renderCanvasImages();
        this.saveState();
    },

    renderCanvasImages() {
        const canvas = document.getElementById('canvas');

        // Remove all existing elements
        canvas.querySelectorAll('.canvas-image').forEach(el => el.remove());
        canvas.querySelectorAll('.canvas-text').forEach(el => el.remove());
        canvas.querySelectorAll('.canvas-shape').forEach(el => el.remove());

        // Combine all elements (images, text, and shapes) and sort by z-index
        const allElements = [
            ...this.canvasImages.map(img => ({ type: 'image', element: img })),
            ...this.canvasTexts.map(txt => ({ type: 'text', element: txt })),
            ...this.canvasShapes.map(shp => ({ type: 'shape', element: shp }))
        ].sort((a, b) => a.element.zIndex - b.element.zIndex);

        // Render all elements in z-index order (low to high)
        allElements.forEach(item => {
            if (item.type === 'image') {
                this.renderImage(item.element, canvas);
            } else if (item.type === 'text') {
                this.renderText(item.element, canvas);
            } else if (item.type === 'shape') {
                this.renderShape(item.element, canvas);
            }
        });
    },

    renderImage(img, canvas) {
        const imgEl = document.createElement('div');
        imgEl.className = 'canvas-image';
        if (this.selectedImageId === img.id) {
            imgEl.className += ' selected';
        }
        if (img.locked) {
            imgEl.className += ' locked';
        }
        imgEl.style.left = img.x + 'px';
        imgEl.style.top = img.y + 'px';
        imgEl.style.width = img.width + 'px';
        imgEl.style.height = img.height + 'px';
        imgEl.style.zIndex = img.zIndex;
        imgEl.dataset.imageId = img.id;

        imgEl.innerHTML = `
            <div class="canvas-image-wrapper">
                <img src="${img.src}" draggable="false" style="${img.crop ? `
                    object-fit: none !important;
                    object-position: -${img.crop.offsetX}px -${img.crop.offsetY}px !important;
                    width: ${img.crop.sourceWidth}px !important;
                    height: ${img.crop.sourceHeight}px !important;
                ` : ''}">
            </div>
            ${this.selectedImageId === img.id ? this.renderImageToolbar(img) : ''}
        `;

        canvas.appendChild(imgEl);
    },

    renderImageToolbar(img) {
        return `
            <div class="image-top-toolbar">
                ${this.cropMode ? `
                    <!-- Empty toolbar in crop mode, buttons moved below -->
                ` : `
                    <button class="toolbar-btn-small" onclick="app.toggleLockImage(${img.id})" title="${img.locked ? 'Unlock' : 'Lock'}">
                        ${img.locked ? `
                            <svg viewBox="0 0 24 24" stroke-width="2">
                                <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                            </svg>
                        ` : `
                            <svg viewBox="0 0 24 24" stroke-width="2">
                                <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        `}
                    </button>
                    <button class="toolbar-btn-small" onclick="app.copyCanvasImage(${img.id})" title="Copy">
                        <svg viewBox="0 0 24 24" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="toolbar-btn-small" onclick="app.deleteCanvasImage(${img.id})" title="Delete">
                        <svg viewBox="0 0 24 24" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button class="toolbar-btn-small" onclick="app.toggleImageDropdown(${img.id}, event)" title="More options" style="position: relative;">
                        <svg viewBox="0 0 24 24" stroke-width="2" fill="white">
                            <circle cx="5" cy="12" r="1"></circle>
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="19" cy="12" r="1"></circle>
                        </svg>
                        <div class="dropdown-menu" id="dropdown-${img.id}">
                            <div class="dropdown-item" onmousedown="event.stopPropagation(); event.preventDefault(); app.moveLayerToFront(${img.id}); app.closeAllDropdowns();">
                                Front
                            </div>
                            <div class="dropdown-item" onmousedown="event.stopPropagation(); event.preventDefault(); app.moveLayerToBack(${img.id}); app.closeAllDropdowns();">
                                Back
                            </div>
                            <div class="dropdown-item" onmousedown="event.stopPropagation(); event.preventDefault(); app.toggleCropMode(${img.id}); app.closeAllDropdowns();">
                                Crop
                            </div>
                        </div>
                    </button>
                `}
            </div>
            ${!img.locked && this.selectedImageId === img.id && !this.cropMode ? `
                <div class="resize-handle resize-handle-nw"></div>
                <div class="resize-handle resize-handle-ne"></div>
                <div class="resize-handle resize-handle-sw"></div>
                <div class="resize-handle resize-handle-se"></div>
            ` : ''}
            ${!img.locked && this.selectedImageId === img.id && this.cropMode ? this.renderCropControls(img) : ''}
        `;
    },

    renderCropControls(img) {
        return `
            <div class="crop-area" style="
                left: ${this.cropData ? this.cropData.cropX : 0}px;
                top: ${this.cropData ? this.cropData.cropY : 0}px;
                width: ${this.cropData ? this.cropData.cropWidth : img.width}px;
                height: ${this.cropData ? this.cropData.cropHeight : img.height}px;
            ">
                <!-- 8 crop handles: 4 corners + 4 sides -->
                <div class="crop-handle crop-handle-nw"></div>
                <div class="crop-handle crop-handle-n"></div>
                <div class="crop-handle crop-handle-ne"></div>
                <div class="crop-handle crop-handle-e"></div>
                <div class="crop-handle crop-handle-se"></div>
                <div class="crop-handle crop-handle-s"></div>
                <div class="crop-handle crop-handle-sw"></div>
                <div class="crop-handle crop-handle-w"></div>
            </div>
            <!-- Crop control buttons below image -->
            <div style="position: absolute; bottom: -60px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 20; pointer-events: auto;">
                <button onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); app.cancelCrop();" style="padding: 10px 20px; background: white; color: #1a1a1a; border: 2px solid #1a1a1a; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif;">
                    Cancel
                </button>
                <button onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); app.applyCrop();" style="padding: 10px 20px; background: #1a1a1a; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif;">
                    Apply
                </button>
            </div>
        `;
    },

    renderText(txt, canvas) {
        const textEl = document.createElement('div');
        textEl.className = 'canvas-text';
        if (this.selectedTextId === txt.id) {
            textEl.className += ' selected';
        }
        textEl.contentEditable = 'true';
        textEl.style.left = txt.x + 'px';
        textEl.style.top = txt.y + 'px';
        textEl.style.fontFamily = txt.font;
        textEl.style.fontSize = txt.size + 'px';
        textEl.style.color = txt.color;
        textEl.style.zIndex = txt.zIndex;
        textEl.dataset.textId = txt.id;

        // Create text node separately (BEFORE adding buttons)
        const textNode = document.createTextNode(txt.text);
        textEl.appendChild(textNode);

        // Select text when clicked (first click)
        textEl.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent canvas deselection

            // Don't focus if we just finished dragging
            if (this.textDragData && this.textDragData.isDragging) {
                return;
            }

            // Only re-render if we're actually changing selection
            if (this.selectedTextId !== txt.id) {
                this.selectedTextId = txt.id;
                this.selectedImageId = null;
                this.renderCanvasImages();
                // Focus the newly selected text after re-render
                setTimeout(() => {
                    const newTextEl = document.querySelector(`[data-text-id="${txt.id}"]`);
                    if (newTextEl) {
                        newTextEl.focus();
                    }
                }, 0);
            } else {
                // Already selected, just focus for editing
                textEl.focus();
            }
        });

        // Handle dragging
        textEl.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevent canvas deselection

            const text = this.canvasTexts.find(t => t.id === txt.id);
            this.textDragData = {
                textId: txt.id,
                startX: e.clientX,
                startY: e.clientY,
                textStartX: text.x,
                textStartY: text.y
            };
        });

        // Enable editing on double-click - select all text
        textEl.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Select all text
            setTimeout(() => {
                const range = document.createRange();
                range.selectNodeContents(textEl);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }, 0);
        });

        // Update text content when edited
        textEl.addEventListener('input', (e) => {
            const text = this.canvasTexts.find(t => t.id == txt.id);
            if (text) {
                // Get only the text node content (first child)
                const textNode = Array.from(textEl.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    text.text = textNode.textContent.trim();
                }
            }
        });

        // Clear placeholder text on first focus
        textEl.addEventListener('focus', (e) => {
            const text = this.canvasTexts.find(t => t.id == txt.id);
            if (text && text.text === 'Click to edit') {
                // Select all so user can just start typing to replace
                setTimeout(() => {
                    const range = document.createRange();
                    const firstTextNode = Array.from(textEl.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
                    if (firstTextNode) {
                        range.selectNodeContents(firstTextNode);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }, 0);
            }
        });

        canvas.appendChild(textEl);

        // Add text controls if selected
        if (this.selectedTextId === txt.id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.contentEditable = 'false';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteText(txt.id);
            };
            deleteBtn.onmousedown = (e) => e.stopPropagation();
            textEl.appendChild(deleteBtn);

            // Text style toolbar
            const styleToolbar = this.createTextStyleToolbar(txt);
            textEl.appendChild(styleToolbar);

            const layerControls = this.createLayerControls(txt);
            textEl.appendChild(layerControls);
        }
    },

    createTextStyleToolbar(txt) {
        const styleToolbar = document.createElement('div');
        styleToolbar.className = 'text-style-toolbar';
        styleToolbar.contentEditable = 'false';
        styleToolbar.onmousedown = (e) => e.stopPropagation();

        // Font select
        const fontSelect = document.createElement('select');
        fontSelect.className = 'text-style-select';
        fontSelect.innerHTML = `
            <option value="Poppins" ${txt.font === 'Poppins' ? 'selected' : ''}>Poppins</option>
            <option value="Arial" ${txt.font === 'Arial' ? 'selected' : ''}>Arial</option>
            <option value="Courier New" ${txt.font === 'Courier New' ? 'selected' : ''}>Courier New</option>
            <option value="Georgia" ${txt.font === 'Georgia' ? 'selected' : ''}>Georgia</option>
            <option value="Times New Roman" ${txt.font === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
            <option value="Verdana" ${txt.font === 'Verdana' ? 'selected' : ''}>Verdana</option>
            <option value="Impact" ${txt.font === 'Impact' ? 'selected' : ''}>Impact</option>
        `;
        fontSelect.onchange = (e) => {
            e.stopPropagation();
            this.updateSelectedTextFont(e.target.value);
        };
        fontSelect.onclick = (e) => e.stopPropagation();
        fontSelect.onmousedown = (e) => e.stopPropagation();

        // Size select dropdown
        const sizeInput = document.createElement('select');
        sizeInput.className = 'text-style-size';
        const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
        fontSizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            if (size === txt.size) {
                option.selected = true;
            }
            sizeInput.appendChild(option);
        });
        sizeInput.oninput = (e) => {
            e.stopPropagation();
            this.updateSelectedTextSize(e.target.value);
        };
        sizeInput.onclick = (e) => e.stopPropagation();
        sizeInput.onmousedown = (e) => e.stopPropagation();

        // Color input
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'text-style-color';
        colorInput.value = txt.color;
        colorInput.oninput = (e) => {
            e.stopPropagation();
            this.updateSelectedTextColor(e.target.value);
        };
        colorInput.onclick = (e) => e.stopPropagation();
        colorInput.onmousedown = (e) => e.stopPropagation();

        styleToolbar.appendChild(fontSelect);
        styleToolbar.appendChild(sizeInput);
        styleToolbar.appendChild(colorInput);

        return styleToolbar;
    },

    createLayerControls(txt) {
        const layerControls = document.createElement('div');
        layerControls.className = 'layer-controls';
        layerControls.contentEditable = 'false';
        layerControls.onmousedown = (e) => e.stopPropagation();
        layerControls.innerHTML = `
            <button class="layer-btn" onclick="app.moveTextToFront(${txt.id})">Front</button>
            <button class="layer-btn" onclick="app.moveTextToBack(${txt.id})">Back</button>
        `;
        return layerControls;
    },

    handleCanvasMouseDown(e) {
        // Close all dropdowns when clicking anywhere
        this.closeAllDropdowns();

        // Don't start drag/resize if clicking on control buttons or toolbar
        if (e.target.classList.contains('toolbar-btn-small') ||
            e.target.closest('.toolbar-btn-small') ||
            e.target.classList.contains('dropdown-item') ||
            e.target.closest('.dropdown-menu') ||
            e.target.classList.contains('layer-btn')) {
            return;
        }

        // Handle crop handles
        if (e.target.classList.contains('crop-handle')) {
            if (!this.cropData) return;

            const handleClass = e.target.className;
            let cropDirection = 'se'; // default

            if (handleClass.includes('crop-handle-nw')) cropDirection = 'nw';
            else if (handleClass.includes('crop-handle-n')) cropDirection = 'n';
            else if (handleClass.includes('crop-handle-ne')) cropDirection = 'ne';
            else if (handleClass.includes('crop-handle-e')) cropDirection = 'e';
            else if (handleClass.includes('crop-handle-se')) cropDirection = 'se';
            else if (handleClass.includes('crop-handle-s')) cropDirection = 's';
            else if (handleClass.includes('crop-handle-sw')) cropDirection = 'sw';
            else if (handleClass.includes('crop-handle-w')) cropDirection = 'w';

            this.resizeData = {
                imageId: this.cropData.imageId,
                direction: cropDirection,
                startX: e.clientX,
                startY: e.clientY,
                startWidth: this.cropData.cropWidth,
                startHeight: this.cropData.cropHeight,
                startPosX: this.cropData.cropX,
                startPosY: this.cropData.cropY,
                isCropping: true
            };
            e.preventDefault();
            return;
        }

        if (e.target.classList.contains('resize-handle')) {
            const imgEl = e.target.closest('.canvas-image');
            const imageId = parseFloat(imgEl.dataset.imageId);
            const image = this.canvasImages.find(img => img.id === imageId);

            // Don't resize if locked
            if (image.locked) return;

            // Determine which handle was clicked
            const handleClass = e.target.className;
            let resizeDirection = 'se'; // default

            if (handleClass.includes('resize-handle-nw')) resizeDirection = 'nw';
            else if (handleClass.includes('resize-handle-ne')) resizeDirection = 'ne';
            else if (handleClass.includes('resize-handle-sw')) resizeDirection = 'sw';
            else if (handleClass.includes('resize-handle-se')) resizeDirection = 'se';

            this.resizeData = {
                imageId,
                direction: resizeDirection,
                startX: e.clientX,
                startY: e.clientY,
                startWidth: image.width,
                startHeight: image.height,
                startPosX: image.x,
                startPosY: image.y,
                isCropping: this.cropMode
            };
            e.preventDefault();
        } else if (e.target.closest('.canvas-image')) {
            const imgEl = e.target.closest('.canvas-image');
            const imageId = parseFloat(imgEl.dataset.imageId);
            const image = this.canvasImages.find(img => img.id === imageId);

            this.selectedImageId = imageId;
            this.selectedTextId = null;
            this.cropMode = false; // Exit crop mode when selecting
            this.renderCanvasImages();

            // Don't start drag if locked
            if (image.locked) {
                e.preventDefault();
                return;
            }

            this.dragData = {
                imageId,
                startX: e.clientX,
                startY: e.clientY,
                imageStartX: image.x,
                imageStartY: image.y
            };
            e.preventDefault();
        } else if (e.target.closest('.canvas-shape')) {
            // Clicking on a shape - handled by shape's own event listener
            // Don't deselect images/texts here
            return;
        } else {
            // Check if shapes panel is active and a shape is selected
            const shapesPanel = document.getElementById('panel-shapes');
            if (shapesPanel && shapesPanel.classList.contains('active') && this.selectedShape) {
                // Add shape to canvas at click position
                this.addShapeToCanvas();
                return;
            }

            this.selectedImageId = null;
            this.selectedTextId = null;
            this.selectedShapeId = null;
            // Deselect all shapes
            document.querySelectorAll('.canvas-shape').forEach(shape => {
                shape.classList.remove('selected');
            });
            // Exit crop mode and clear crop data
            if (this.cropMode) {
                this.cropMode = false;
                this.cropData = null;
            }
            this.renderCanvasImages();
        }
    },

    handleCanvasMouseMove(e) {
        if (this.dragData) {
            const deltaX = e.clientX - this.dragData.startX;
            const deltaY = e.clientY - this.dragData.startY;

            const image = this.canvasImages.find(img => img.id === this.dragData.imageId);
            image.x = this.dragData.imageStartX + deltaX;
            image.y = this.dragData.imageStartY + deltaY;

            this.renderCanvasImages();
        } else if (this.textDragData) {
            const deltaX = e.clientX - this.textDragData.startX;
            const deltaY = e.clientY - this.textDragData.startY;

            // Only start dragging if moved more than 3 pixels (prevents accidental drag on click)
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > 3) {
                const text = this.canvasTexts.find(txt => txt.id === this.textDragData.textId);
                text.x = this.textDragData.textStartX + deltaX;
                text.y = this.textDragData.textStartY + deltaY;

                // Mark that we're actively dragging
                this.textDragData.isDragging = true;

                this.renderCanvasImages();
            }
        } else if (this.resizeData) {
            this.handleResize(e);
        }
    },

    handleResize(e) {
        const deltaX = e.clientX - this.resizeData.startX;
        const deltaY = e.clientY - this.resizeData.startY;

        // Handle crop resizing
        if (this.resizeData.isCropping && this.cropData) {
            this.handleCropResize(deltaX, deltaY);
        } else {
            this.handleImageResize(deltaX, deltaY);
        }

        this.renderCanvasImages();
    },

    handleCropResize(deltaX, deltaY) {
        const dir = this.resizeData.direction;
        const minSize = 50;

        // Calculate new crop dimensions based on direction
        if (dir === 'se') {
            this.cropData.cropWidth = Math.max(minSize, this.resizeData.startWidth + deltaX);
            this.cropData.cropHeight = Math.max(minSize, this.resizeData.startHeight + deltaY);
        } else if (dir === 'nw') {
            const newWidth = Math.max(minSize, this.resizeData.startWidth - deltaX);
            const newHeight = Math.max(minSize, this.resizeData.startHeight - deltaY);
            this.cropData.cropX = this.resizeData.startPosX + (this.resizeData.startWidth - newWidth);
            this.cropData.cropY = this.resizeData.startPosY + (this.resizeData.startHeight - newHeight);
            this.cropData.cropWidth = newWidth;
            this.cropData.cropHeight = newHeight;
        } else if (dir === 'ne') {
            const newHeight = Math.max(minSize, this.resizeData.startHeight - deltaY);
            this.cropData.cropWidth = Math.max(minSize, this.resizeData.startWidth + deltaX);
            this.cropData.cropY = this.resizeData.startPosY + (this.resizeData.startHeight - newHeight);
            this.cropData.cropHeight = newHeight;
        } else if (dir === 'sw') {
            const newWidth = Math.max(minSize, this.resizeData.startWidth - deltaX);
            this.cropData.cropX = this.resizeData.startPosX + (this.resizeData.startWidth - newWidth);
            this.cropData.cropWidth = newWidth;
            this.cropData.cropHeight = Math.max(minSize, this.resizeData.startHeight + deltaY);
        } else if (dir === 'n') {
            const newHeight = Math.max(minSize, this.resizeData.startHeight - deltaY);
            this.cropData.cropY = this.resizeData.startPosY + (this.resizeData.startHeight - newHeight);
            this.cropData.cropHeight = newHeight;
        } else if (dir === 's') {
            this.cropData.cropHeight = Math.max(minSize, this.resizeData.startHeight + deltaY);
        } else if (dir === 'w') {
            const newWidth = Math.max(minSize, this.resizeData.startWidth - deltaX);
            this.cropData.cropX = this.resizeData.startPosX + (this.resizeData.startWidth - newWidth);
            this.cropData.cropWidth = newWidth;
        } else if (dir === 'e') {
            this.cropData.cropWidth = Math.max(minSize, this.resizeData.startWidth + deltaX);
        }
    },

    handleImageResize(deltaX, deltaY) {
        const image = this.canvasImages.find(img => img.id === this.resizeData.imageId);
        const dir = this.resizeData.direction;

        // Calculate new dimensions based on direction
        if (dir === 'se') {
            image.width = Math.max(50, this.resizeData.startWidth + deltaX);
            image.height = Math.max(50, this.resizeData.startHeight + deltaY);
        } else if (dir === 'nw') {
            const newWidth = Math.max(50, this.resizeData.startWidth - deltaX);
            const newHeight = Math.max(50, this.resizeData.startHeight - deltaY);
            image.x = this.resizeData.startPosX + (this.resizeData.startWidth - newWidth);
            image.y = this.resizeData.startPosY + (this.resizeData.startHeight - newHeight);
            image.width = newWidth;
            image.height = newHeight;
        } else if (dir === 'ne') {
            const newHeight = Math.max(50, this.resizeData.startHeight - deltaY);
            image.width = Math.max(50, this.resizeData.startWidth + deltaX);
            image.y = this.resizeData.startPosY + (this.resizeData.startHeight - newHeight);
            image.height = newHeight;
        } else if (dir === 'sw') {
            const newWidth = Math.max(50, this.resizeData.startWidth - deltaX);
            image.x = this.resizeData.startPosX + (this.resizeData.startWidth - newWidth);
            image.width = newWidth;
            image.height = Math.max(50, this.resizeData.startHeight + deltaY);
        }
    },

    handleCanvasMouseUp() {
        const hadOperation = this.dragData || this.textDragData || this.resizeData;
        this.dragData = null;
        this.textDragData = null;
        this.resizeData = null;

        if (hadOperation) {
            this.saveState();
        }
    },

    handleCanvasTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true
            });
            e.target.dispatchEvent(mouseEvent);
            e.preventDefault();
        }
    },

    handleCanvasTouchMove(e) {
        if (e.touches.length === 1 && (this.dragData || this.resizeData)) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true
            });
            window.dispatchEvent(mouseEvent);
            e.preventDefault();
        }
    },

    handleCanvasTouchEnd() {
        this.handleCanvasMouseUp();
    },

    deleteCanvasImage(imageId) {
        this.canvasImages = this.canvasImages.filter(img => img.id !== imageId);
        this.selectedImageId = null;
        this.renderCanvasImages();
        this.saveState();
    },

    toggleLockImage(imageId) {
        const image = this.canvasImages.find(img => img.id === imageId);
        if (image) {
            image.locked = !image.locked;
            this.renderCanvasImages();
        }
    },

    copyCanvasImage(imageId) {
        const image = this.canvasImages.find(img => img.id === imageId);
        if (!image) return;

        const newImage = {
            id: Date.now() + Math.random(),
            src: image.src,
            x: image.x + 20,
            y: image.y + 20,
            width: image.width,
            height: image.height,
            locked: false,
            zIndex: Math.max(...this.canvasImages.map(img => img.zIndex)) + 1
        };

        this.canvasImages.push(newImage);
        this.selectedImageId = newImage.id;
        this.renderCanvasImages();
    },

    toggleImageDropdown(imageId, event) {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-${imageId}`);

        // Close all other dropdowns first
        this.closeAllDropdowns();

        // Toggle this dropdown
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    },

    closeAllDropdowns() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('active');
        });
    },

    toggleCropMode(imageId) {
        const image = this.canvasImages.find(img => img.id === imageId);
        if (!image) return;

        // If already in crop mode, exit it
        if (this.cropMode) {
            this.cropMode = false;
            this.cropData = null;
        } else {
            // Enter crop mode
            this.cropMode = true;
            this.selectedImageId = imageId;

            // Store crop data (default to full image)
            this.cropData = {
                imageId: imageId,
                cropX: 0,
                cropY: 0,
                cropWidth: image.width,
                cropHeight: image.height,
                originalWidth: image.width,
                originalHeight: image.height
            };
        }
        this.renderCanvasImages();
    },

    applyCrop() {
        if (!this.cropData) {
            return;
        }

        const image = this.canvasImages.find(img => img.id === this.cropData.imageId);
        if (!image) {
            return;
        }

        // Initialize crop object if first time cropping
        if (!image.crop) {
            image.crop = {
                sourceWidth: image.width,
                sourceHeight: image.height,
                offsetX: 0,
                offsetY: 0
            };
        }

        // Calculate how much we're cropping from the left and top
        // These need to be scaled to the original image dimensions
        const scaleX = image.crop.sourceWidth / image.width;
        const scaleY = image.crop.sourceHeight / image.height;

        // Add to the existing offset (to support multiple crops)
        image.crop.offsetX += this.cropData.cropX * scaleX;
        image.crop.offsetY += this.cropData.cropY * scaleY;

        // Update the container dimensions to the cropped size
        image.width = this.cropData.cropWidth;
        image.height = this.cropData.cropHeight;

        // Move the image position on the canvas to account for the crop
        // When we crop from the left, the image moves right on the canvas
        image.x += this.cropData.cropX;
        image.y += this.cropData.cropY;

        // Exit crop mode
        this.cropMode = false;
        this.cropData = null;
        this.renderCanvasImages();
        this.saveState();
    },

    cancelCrop() {
        // Exit crop mode without applying changes and deselect
        this.cropMode = false;
        this.cropData = null;
        this.selectedImageId = null;
        this.renderCanvasImages();
    },

    moveLayerToFront(imageId) {
        // Find the image
        const image = this.canvasImages.find(img => img.id === imageId);
        if (!image) return;

        // Get all current z-indexes
        const allZIndexes = this.canvasImages.map(img => img.zIndex);

        // Find the highest z-index
        const maxZ = Math.max(...allZIndexes);

        // Set this image to be higher than the highest
        image.zIndex = maxZ + 10;

        // Re-render everything
        this.renderCanvasImages();
    },

    moveLayerToBack(imageId) {
        const image = this.canvasImages.find(img => img.id === imageId);
        if (!image) return;

        // Find the minimum z-index (but keep it at least 1)
        const allZIndexes = this.canvasImages.map(img => img.zIndex);
        const minZ = Math.min(...allZIndexes);

        // If minimum is already 1 or less, we need to push everything else up
        if (minZ <= 1) {
            // Push all OTHER images up by 10
            this.canvasImages.forEach(img => {
                if (img.id !== imageId) {
                    img.zIndex = img.zIndex + 10;
                }
            });
            // Set this image to 1 (the back)
            image.zIndex = 1;
        } else {
            // There's room below, just set to minZ - 10
            image.zIndex = minZ - 10;
        }

        // Re-render everything
        this.renderCanvasImages();
    },

    deleteText(textId) {
        this.canvasTexts = this.canvasTexts.filter(txt => txt.id !== textId);
        this.selectedTextId = null;
        this.renderCanvasImages();
    },

    moveTextToFront(textId) {
        const text = this.canvasTexts.find(txt => txt.id === textId);
        if (!text) return;

        // Find the highest zIndex among all elements
        const allZIndexes = [
            ...this.canvasImages.map(img => img.zIndex),
            ...this.canvasTexts.map(txt => txt.zIndex),
            ...this.canvasShapes.map(shp => shp.zIndex)
        ];
        const maxZIndex = Math.max(...allZIndexes);

        text.zIndex = maxZIndex + 1;
        this.renderCanvasImages();
        this.saveState();
    },

    moveTextToBack(textId) {
        const text = this.canvasTexts.find(txt => txt.id === textId);
        if (!text) return;

        // Find the lowest zIndex among all elements
        const allZIndexes = [
            ...this.canvasImages.map(img => img.zIndex),
            ...this.canvasTexts.map(txt => txt.zIndex),
            ...this.canvasShapes.map(shp => shp.zIndex)
        ];
        const minZIndex = Math.min(...allZIndexes);

        text.zIndex = minZIndex - 1;
        this.renderCanvasImages();
        this.saveState();
    },

    updateSelectedTextFont(font) {
        if (!this.selectedTextId) return;
        const text = this.canvasTexts.find(txt => txt.id === this.selectedTextId);
        if (text) {
            text.font = font;
            this.renderCanvasImages();
            this.saveState();
        }
    },

    updateSelectedTextSize(size) {
        if (!this.selectedTextId) return;
        const text = this.canvasTexts.find(txt => txt.id === this.selectedTextId);
        if (text) {
            text.size = parseInt(size);
            this.renderCanvasImages();
            this.saveState();
        }
    },

    updateSelectedTextColor(color) {
        if (!this.selectedTextId) return;
        const text = this.canvasTexts.find(txt => txt.id === this.selectedTextId);
        if (text) {
            text.color = color;
            this.renderCanvasImages();
            this.saveState();
        }
    },

    async exportCarousel() {
        // Get the canvas element
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            alert('No canvas found to export');
            return;
        }

        try {
            // Import html2canvas dynamically
            const html2canvas = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');

            // Show loading message
            const originalText = event.target.textContent;
            event.target.textContent = 'Exporting...';
            event.target.disabled = true;

            // Capture the canvas as an image
            const canvasImage = await html2canvas.default(canvas, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher quality
                useCORS: true,
                allowTaint: true
            });

            // Convert to blob
            canvasImage.toBlob((blob) => {
                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().slice(0, 10);
                link.download = `keepsake-${timestamp}.png`;
                link.href = url;

                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Clean up
                URL.revokeObjectURL(url);

                // Reset button
                event.target.textContent = originalText;
                event.target.disabled = false;

                // Show success message
                if (window.authManager) {
                    window.authManager.showSuccess('Image saved! Check your downloads folder.');
                } else {
                    alert('Image exported successfully! Check your downloads folder.');
                }
            }, 'image/png');

        } catch (error) {
            console.error('Export error:', error);

            // Fallback: Show instructions
            alert('To save your keepsake:\n\n1. Take a screenshot of the canvas\n2. On mobile: Press and hold the image, then tap "Save Image"\n3. On desktop: Right-click the canvas and select "Save image as..."');

            // Reset button if it was changed
            if (event && event.target) {
                event.target.textContent = 'Export';
                event.target.disabled = false;
            }
        }
    },

    // Shapes functionality
    selectShape(shape) {
        this.selectedShape = shape;

        // Update UI
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-shape="${shape}"]`).classList.add('active');
    },

    updateShapeColor(color) {
        this.shapeColor = color;
        document.getElementById('shapeColorPicker').value = color;

        // Update selected shape color if any
        if (this.selectedShapeId) {
            const shapeElement = document.getElementById(this.selectedShapeId);
            if (shapeElement) {
                const svg = shapeElement.querySelector('svg');
                if (svg) {
                    svg.style.color = color;
                }
                // Update in data
                const shapeData = this.canvasShapes.find(s => s.id === this.selectedShapeId);
                if (shapeData) {
                    shapeData.color = color;
                    this.saveState();
                }
            }
        }
    },

    addShapeToCanvas() {
        if (!this.selectedShape) return;

        const shapeId = 'shape-' + Date.now();
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();

        // Create shape element
        const shapeElement = document.createElement('div');
        shapeElement.id = shapeId;
        shapeElement.className = 'canvas-shape';
        shapeElement.style.left = '50%';
        shapeElement.style.top = '50%';
        shapeElement.style.transform = 'translate(-50%, -50%)';
        shapeElement.style.width = '100px';
        shapeElement.style.height = '100px';

        // Create SVG
        const svg = this.createShapeSVG(this.selectedShape, this.shapeColor);
        shapeElement.appendChild(svg);

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'shape-resize-handle';
        shapeElement.appendChild(resizeHandle);

        // Add to canvas
        canvas.appendChild(shapeElement);

        // Store shape data
        const shapeData = {
            id: shapeId,
            type: this.selectedShape,
            color: this.shapeColor,
            left: '50%',
            top: '50%',
            width: 100,
            height: 100,
            transform: 'translate(-50%, -50%)',
            zIndex: this.canvasImages.length + this.canvasTexts.length + this.canvasShapes.length
        };
        this.canvasShapes.push(shapeData);

        // Add event listeners
        this.setupShapeInteractions(shapeElement, shapeId);

        this.saveState();
    },

    createShapeSVG(shapeType, color) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.style.color = color;
        svg.style.pointerEvents = 'none';

        let path;
        switch(shapeType) {
            case 'circle':
                path = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                path.setAttribute('cx', '12');
                path.setAttribute('cy', '12');
                path.setAttribute('r', '10');
                path.setAttribute('fill', 'currentColor');
                break;
            case 'square':
                path = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                path.setAttribute('x', '2');
                path.setAttribute('y', '2');
                path.setAttribute('width', '20');
                path.setAttribute('height', '20');
                path.setAttribute('fill', 'currentColor');
                break;
            case 'rectangle':
                path = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                path.setAttribute('x', '2');
                path.setAttribute('y', '6');
                path.setAttribute('width', '20');
                path.setAttribute('height', '12');
                path.setAttribute('fill', 'currentColor');
                break;
            case 'triangle':
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M12 2 L22 22 L2 22 Z');
                path.setAttribute('fill', 'currentColor');
                break;
            case 'star':
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M12 2 L14.5 9.5 L22 10 L16.5 15 L18 22 L12 18 L6 22 L7.5 15 L2 10 L9.5 9.5 Z');
                path.setAttribute('fill', 'currentColor');
                break;
            case 'heart':
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
                path.setAttribute('fill', 'currentColor');
                break;
        }

        svg.appendChild(path);
        return svg;
    },

    setupShapeInteractions(shapeElement, shapeId) {
        const resizeHandle = shapeElement.querySelector('.shape-resize-handle');

        // Click to select
        shapeElement.addEventListener('mousedown', (e) => {
            if (e.target === resizeHandle) return;
            this.selectShapeElement(shapeId);
            this.startShapeDrag(e, shapeId);
        });

        shapeElement.addEventListener('touchstart', (e) => {
            if (e.target === resizeHandle) return;
            e.preventDefault();
            this.selectShapeElement(shapeId);
            this.startShapeDrag(e.touches[0], shapeId);
        }, { passive: false });

        // Resize handle
        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startShapeResize(e, shapeId);
        });

        resizeHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startShapeResize(e.touches[0], shapeId);
        }, { passive: false });

        // Delete on backspace/delete
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectedShapeId === shapeId) {
                this.deleteShape(shapeId);
            }
        });
    },

    selectShapeElement(shapeId) {
        // Deselect images and texts
        this.selectedImageId = null;
        this.selectedTextId = null;

        // Deselect all shapes
        document.querySelectorAll('.canvas-shape').forEach(shape => {
            shape.classList.remove('selected');
        });

        // Select this shape
        const shapeElement = document.getElementById(shapeId);
        if (shapeElement) {
            shapeElement.classList.add('selected');
            this.selectedShapeId = shapeId;

            // Update color picker to match shape color
            const shapeData = this.canvasShapes.find(s => s.id === shapeId);
            if (shapeData) {
                document.getElementById('shapeColorPicker').value = shapeData.color;
            }
        }

        // Re-render to update selected state of images/texts
        this.renderCanvasImages();
    },

    startShapeDrag(e, shapeId) {
        const shapeElement = document.getElementById(shapeId);
        if (!shapeElement) return;

        const rect = shapeElement.getBoundingClientRect();
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();

        this.shapeDragData = {
            shapeId: shapeId,
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: rect.left - canvasRect.left,
            initialTop: rect.top - canvasRect.top
        };

        const moveHandler = (e) => this.handleShapeDragMove(e);
        const upHandler = () => this.stopShapeDrag(moveHandler, upHandler);

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
        window.addEventListener('touchmove', moveHandler);
        window.addEventListener('touchend', upHandler);
    },

    handleShapeDragMove(e) {
        if (!this.shapeDragData) return;

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const deltaX = clientX - this.shapeDragData.startX;
        const deltaY = clientY - this.shapeDragData.startY;

        const shapeElement = document.getElementById(this.shapeDragData.shapeId);
        if (!shapeElement) return;

        const newLeft = this.shapeDragData.initialLeft + deltaX;
        const newTop = this.shapeDragData.initialTop + deltaY;

        shapeElement.style.left = newLeft + 'px';
        shapeElement.style.top = newTop + 'px';
        shapeElement.style.transform = 'none';
    },

    stopShapeDrag(moveHandler, upHandler) {
        if (this.shapeDragData) {
            const shapeElement = document.getElementById(this.shapeDragData.shapeId);
            if (shapeElement) {
                // Update shape data
                const shapeData = this.canvasShapes.find(s => s.id === this.shapeDragData.shapeId);
                if (shapeData) {
                    shapeData.left = shapeElement.style.left;
                    shapeData.top = shapeElement.style.top;
                    shapeData.transform = 'none';
                }
                this.saveState();
            }
        }

        this.shapeDragData = null;
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', upHandler);
    },

    startShapeResize(e, shapeId) {
        const shapeElement = document.getElementById(shapeId);
        if (!shapeElement) return;

        const rect = shapeElement.getBoundingClientRect();

        this.shapeResizeData = {
            shapeId: shapeId,
            startX: e.clientX,
            startY: e.clientY,
            initialWidth: rect.width,
            initialHeight: rect.height
        };

        const moveHandler = (e) => this.handleShapeResizeMove(e);
        const upHandler = () => this.stopShapeResize(moveHandler, upHandler);

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
        window.addEventListener('touchmove', moveHandler);
        window.addEventListener('touchend', upHandler);
    },

    handleShapeResizeMove(e) {
        if (!this.shapeResizeData) return;

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const deltaX = clientX - this.shapeResizeData.startX;
        const deltaY = clientY - this.shapeResizeData.startY;

        const shapeElement = document.getElementById(this.shapeResizeData.shapeId);
        if (!shapeElement) return;

        const newWidth = Math.max(50, this.shapeResizeData.initialWidth + deltaX);
        const newHeight = Math.max(50, this.shapeResizeData.initialHeight + deltaY);

        shapeElement.style.width = newWidth + 'px';
        shapeElement.style.height = newHeight + 'px';
    },

    stopShapeResize(moveHandler, upHandler) {
        if (this.shapeResizeData) {
            const shapeElement = document.getElementById(this.shapeResizeData.shapeId);
            if (shapeElement) {
                // Update shape data
                const shapeData = this.canvasShapes.find(s => s.id === this.shapeResizeData.shapeId);
                if (shapeData) {
                    shapeData.width = parseInt(shapeElement.style.width);
                    shapeData.height = parseInt(shapeElement.style.height);
                }
                this.saveState();
            }
        }

        this.shapeResizeData = null;
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', upHandler);
    },

    deleteShape(shapeId) {
        const shapeElement = document.getElementById(shapeId);
        if (shapeElement) {
            shapeElement.remove();
        }

        // Remove from data
        this.canvasShapes = this.canvasShapes.filter(s => s.id !== shapeId);
        this.selectedShapeId = null;
        this.saveState();
    },

    renderShape(shp, canvas) {
        const shapeElement = document.createElement('div');
        shapeElement.id = shp.id;
        shapeElement.className = 'canvas-shape';
        if (this.selectedShapeId === shp.id) {
            shapeElement.className += ' selected';
        }
        shapeElement.style.left = shp.left;
        shapeElement.style.top = shp.top;
        shapeElement.style.width = shp.width + 'px';
        shapeElement.style.height = shp.height + 'px';
        shapeElement.style.transform = shp.transform;
        shapeElement.style.zIndex = shp.zIndex;

        // Create SVG
        const svg = this.createShapeSVG(shp.type, shp.color);
        shapeElement.appendChild(svg);

        // Add resize handle (only visible when selected)
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'shape-resize-handle';
        shapeElement.appendChild(resizeHandle);

        // Add toolbar if selected
        if (this.selectedShapeId === shp.id) {
            const toolbar = this.renderShapeToolbar(shp);
            shapeElement.insertAdjacentHTML('beforeend', toolbar);
        }

        // Add to canvas
        canvas.appendChild(shapeElement);

        // Add event listeners
        this.setupShapeInteractions(shapeElement, shp.id);
    },

    renderShapeToolbar(shp) {
        return `
            <div class="image-top-toolbar">
                <button class="toolbar-btn-small" onclick="app.copyShape('${shp.id}')" title="Copy">
                    <svg viewBox="0 0 24 24" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button class="toolbar-btn-small" onclick="app.deleteShape('${shp.id}')" title="Delete">
                    <svg viewBox="0 0 24 24" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <button class="toolbar-btn-small" onclick="app.toggleShapeDropdown('${shp.id}', event)" title="More options" style="position: relative;">
                    <svg viewBox="0 0 24 24" stroke-width="2" fill="white">
                        <circle cx="5" cy="12" r="1"></circle>
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                    </svg>
                    <div class="dropdown-menu" id="dropdown-shape-${shp.id}">
                        <div class="dropdown-item" onmousedown="event.stopPropagation(); event.preventDefault(); app.moveShapeToFront('${shp.id}'); app.closeAllDropdowns();">
                            Front
                        </div>
                        <div class="dropdown-item" onmousedown="event.stopPropagation(); event.preventDefault(); app.moveShapeToBack('${shp.id}'); app.closeAllDropdowns();">
                            Back
                        </div>
                    </div>
                </button>
            </div>
        `;
    },

    toggleShapeDropdown(shapeId, event) {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-shape-${shapeId}`);
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    },

    copyShape(shapeId) {
        const shape = this.canvasShapes.find(s => s.id === shapeId);
        if (!shape) return;

        const newShape = {
            ...JSON.parse(JSON.stringify(shape)),
            id: 'shape-' + Date.now(),
            left: (parseInt(shape.left) + 20) + 'px',
            top: (parseInt(shape.top) + 20) + 'px',
            zIndex: Math.max(...this.canvasImages.map(i => i.zIndex), ...this.canvasTexts.map(t => t.zIndex), ...this.canvasShapes.map(s => s.zIndex)) + 1
        };

        this.canvasShapes.push(newShape);
        this.selectedShapeId = newShape.id;
        this.renderCanvasImages();
        this.saveState();
    },

    moveShapeToFront(shapeId) {
        const shape = this.canvasShapes.find(s => s.id === shapeId);
        if (!shape) return;

        // Get all current z-indexes from all elements
        const allZIndexes = [
            ...this.canvasImages.map(img => img.zIndex),
            ...this.canvasTexts.map(txt => txt.zIndex),
            ...this.canvasShapes.map(shp => shp.zIndex)
        ];

        // Find the highest z-index
        const maxZ = Math.max(...allZIndexes);

        // Set this shape to be higher than the highest
        shape.zIndex = maxZ + 10;

        // Re-render everything
        this.renderCanvasImages();
        this.saveState();
    },

    moveShapeToBack(shapeId) {
        const shape = this.canvasShapes.find(s => s.id === shapeId);
        if (!shape) return;

        // Get all current z-indexes from all elements
        const allZIndexes = [
            ...this.canvasImages.map(img => img.zIndex),
            ...this.canvasTexts.map(txt => txt.zIndex),
            ...this.canvasShapes.map(shp => shp.zIndex)
        ];

        // Find the minimum z-index
        const minZ = Math.min(...allZIndexes);

        // If minimum is already 1 or less, we need to push everything else up
        if (minZ <= 1) {
            // Push all OTHER elements up by 10
            this.canvasImages.forEach(img => img.zIndex = img.zIndex + 10);
            this.canvasTexts.forEach(txt => txt.zIndex = txt.zIndex + 10);
            this.canvasShapes.forEach(shp => {
                if (shp.id !== shapeId) {
                    shp.zIndex = shp.zIndex + 10;
                }
            });
            // Set this shape to 1 (the back)
            shape.zIndex = 1;
        } else {
            // There's room below, just set to minZ - 10
            shape.zIndex = minZ - 10;
        }

        this.renderCanvasImages();
        this.saveState();
    },

    // Save current state to history
    saveState() {
        const state = {
            canvasImages: JSON.parse(JSON.stringify(this.canvasImages)),
            canvasTexts: JSON.parse(JSON.stringify(this.canvasTexts)),
            canvasShapes: JSON.parse(JSON.stringify(this.canvasShapes)),
            numSlides: this.numSlides
        };

        // Remove any states after current index (for when user undoes then makes new change)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(state);

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        this.updateHistoryButtons();
    },

    // Restore state from history
    restoreState(state) {
        this.canvasImages = JSON.parse(JSON.stringify(state.canvasImages));
        this.canvasTexts = JSON.parse(JSON.stringify(state.canvasTexts));
        this.canvasShapes = JSON.parse(JSON.stringify(state.canvasShapes || []));
        this.numSlides = state.numSlides;

        this.renderCanvasImages();
        this.updateHistoryButtons();
    },

    // Undo last action
    undo() {
        if (this.historyIndex <= 0) return;

        this.historyIndex--;
        this.restoreState(this.history[this.historyIndex]);
    },

    // Redo last undone action
    redo() {
        if (this.historyIndex >= this.history.length - 1) return;

        this.historyIndex++;
        this.restoreState(this.history[this.historyIndex]);
    },

    // Update undo/redo button states
    updateHistoryButtons() {
        const undoBtn = document.getElementById('btnUndo');
        const redoBtn = document.getElementById('btnRedo');

        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
        }

        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.history.length - 1;
        }
    },

    // Show preview modal - Carousel style
    showPreview() {
        this.currentPreviewSlide = 0;
        this.renderCarouselPreview();
        const modal = document.getElementById('canvasPreviewModal');
        modal.classList.add('active');
        this.setupCarouselListeners();
    },

    // Close preview modal
    closePreview() {
        const modal = document.getElementById('canvasPreviewModal');
        modal.classList.remove('active');
        this.removeCarouselListeners();
    },

    // Render all slides in carousel
    renderCarouselPreview() {
        const track = document.getElementById('carouselTrack');
        const dotsContainer = document.getElementById('carouselDots');

        // Clear existing content
        track.innerHTML = '';
        dotsContainer.innerHTML = '';

        // Create all slides
        for (let slideIndex = 0; slideIndex < this.numSlides; slideIndex++) {
            // Create slide container
            const slideDiv = document.createElement('div');
            slideDiv.className = 'carousel-slide';

            // Create canvas for this slide
            const canvas = document.createElement('canvas');
            canvas.width = this.canvasDimensions.width;
            canvas.height = this.canvasDimensions.height;

            // Render slide content
            this.renderSlideToCanvas(canvas, slideIndex);

            slideDiv.appendChild(canvas);
            track.appendChild(slideDiv);

            // Create dot indicator
            const dot = document.createElement('div');
            dot.className = 'carousel-dot' + (slideIndex === 0 ? ' active' : '');
            dot.addEventListener('click', () => this.scrollToSlide(slideIndex));
            dotsContainer.appendChild(dot);
        }

        // Hide dots if only one slide
        if (this.numSlides <= 1) {
            dotsContainer.style.display = 'none';
        } else {
            dotsContainer.style.display = 'flex';
        }

        this.updateCarouselNavButtons();
    },

    // Render a single slide to canvas
    renderSlideToCanvas(canvas, slideIndex) {
        const ctx = canvas.getContext('2d');

        // Clear canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate slide bounds
        const slideStartX = slideIndex * this.canvasDimensions.width;
        const slideEndX = slideStartX + this.canvasDimensions.width;

        // Get all items (images and texts) that are on this slide
        const allItems = [
            ...this.canvasImages.map(img => ({ type: 'image', data: img, zIndex: img.zIndex })),
            ...this.canvasTexts.map(txt => ({ type: 'text', data: txt, zIndex: txt.zIndex }))
        ];

        // Sort by zIndex
        allItems.sort((a, b) => a.zIndex - b.zIndex);

        // Render items on this slide
        allItems.forEach(item => {
            if (item.type === 'image') {
                const img = item.data;
                // Check if image is on this slide
                if (img.x + img.width > slideStartX && img.x < slideEndX) {
                    this.renderPreviewImage(img, ctx, slideStartX);
                }
            } else if (item.type === 'text') {
                const txt = item.data;
                // Check if text is on this slide
                if (txt.x >= slideStartX && txt.x < slideEndX) {
                    this.renderPreviewText(txt, ctx, slideStartX);
                }
            }
        });

        // Render drawing canvas for this slide
        if (this.drawingCanvas) {
            ctx.drawImage(
                this.drawingCanvas,
                slideStartX, 0, this.canvasDimensions.width, this.canvasDimensions.height,
                0, 0, this.canvasDimensions.width, this.canvasDimensions.height
            );
        }
    },

    // Render image in preview
    renderPreviewImage(img, ctx, slideStartX) {
        const image = new Image();
        image.onload = () => {
            const x = img.x - slideStartX;
            const y = img.y;

            if (img.crop) {
                ctx.drawImage(
                    image,
                    img.crop.offsetX,
                    img.crop.offsetY,
                    img.crop.sourceWidth,
                    img.crop.sourceHeight,
                    x, y, img.width, img.height
                );
            } else {
                ctx.drawImage(image, x, y, img.width, img.height);
            }
        };
        image.src = img.src;
    },

    // Render text in preview
    renderPreviewText(txt, ctx, slideStartX) {
        const x = txt.x - slideStartX;
        const y = txt.y;

        ctx.font = `${txt.size}px ${txt.font}`;
        ctx.fillStyle = txt.color;
        ctx.textBaseline = 'top';
        ctx.fillText(txt.text, x, y);
    },

    // Navigate between slides - button click
    navigatePreviewSlide(direction, event) {
        if (event) event.stopPropagation();
        const newSlide = this.currentPreviewSlide + direction;
        if (newSlide < 0 || newSlide >= this.numSlides) return;

        this.scrollToSlide(newSlide);
    },

    // Scroll to specific slide
    scrollToSlide(slideIndex) {
        const track = document.getElementById('carouselTrack');
        const slideWidth = track.scrollWidth / this.numSlides;
        track.scrollTo({
            left: slideIndex * slideWidth,
            behavior: 'smooth'
        });
    },

    // Setup carousel event listeners
    setupCarouselListeners() {
        const track = document.getElementById('carouselTrack');

        // Handle scroll event to update current slide
        this.carouselScrollHandler = () => {
            const slideWidth = track.scrollWidth / this.numSlides;
            const newSlide = Math.round(track.scrollLeft / slideWidth);

            if (newSlide !== this.currentPreviewSlide) {
                this.currentPreviewSlide = newSlide;
                this.updateCarouselDots();
                this.updateCarouselNavButtons();
            }
        };

        track.addEventListener('scroll', this.carouselScrollHandler);
    },

    // Remove carousel event listeners
    removeCarouselListeners() {
        const track = document.getElementById('carouselTrack');
        if (this.carouselScrollHandler) {
            track.removeEventListener('scroll', this.carouselScrollHandler);
        }
    },

    // Update dot indicators
    updateCarouselDots() {
        const dots = document.querySelectorAll('.carousel-dot');
        dots.forEach((dot, index) => {
            if (index === this.currentPreviewSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    },

    // Update navigation button states
    updateCarouselNavButtons() {
        const prevBtn = document.getElementById('carouselPrevBtn');
        const nextBtn = document.getElementById('carouselNextBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentPreviewSlide <= 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPreviewSlide >= this.numSlides - 1;
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
