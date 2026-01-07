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

    // Drawing tool state
    drawingCanvas: null,
    drawingCtx: null,
    isDrawing: false,
    drawTool: 'pen', // 'pen', 'marker', 'highlighter', 'eraser'
    drawColor: '#1a1a1a',
    drawWeight: 12,
    drawOpacity: 100,
    lastX: 0,
    lastY: 0,

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

        // Clear canvas but preserve the drawing canvas
        const drawingCanvas = document.getElementById('drawingCanvas');
        canvas.innerHTML = '';
        if (drawingCanvas) {
            canvas.appendChild(drawingCanvas);
        }

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

        // Initialize drawing canvas
        this.initDrawingCanvas();

        this.renderCanvasImages();
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

        // Update drawing canvas state
        this.updateDrawingCanvasState();
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
    },

    renderCanvasImages() {
        const canvas = document.getElementById('canvas');

        // Remove all existing elements but preserve drawing canvas and splice lines
        canvas.querySelectorAll('.canvas-image').forEach(el => el.remove());
        canvas.querySelectorAll('.canvas-text').forEach(el => el.remove());

        // Combine all elements (images and text) and sort by z-index
        const allElements = [
            ...this.canvasImages.map(img => ({ type: 'image', element: img })),
            ...this.canvasTexts.map(txt => ({ type: 'text', element: txt }))
        ].sort((a, b) => a.element.zIndex - b.element.zIndex);

        // Render all elements in z-index order (low to high)
        allElements.forEach(item => {
            if (item.type === 'image') {
                this.renderImage(item.element, canvas);
            } else if (item.type === 'text') {
                this.renderText(item.element, canvas);
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

        // Size input
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.className = 'text-style-size';
        sizeInput.value = txt.size;
        sizeInput.min = 12;
        sizeInput.max = 72;
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
        } else {
            this.selectedImageId = null;
            this.selectedTextId = null;
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
        this.dragData = null;
        this.textDragData = null;
        this.resizeData = null;
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
            ...this.canvasTexts.map(txt => txt.zIndex)
        ];
        const maxZIndex = Math.max(...allZIndexes);

        text.zIndex = maxZIndex + 1;
        this.renderCanvasImages();
    },

    moveTextToBack(textId) {
        const text = this.canvasTexts.find(txt => txt.id === textId);
        if (!text) return;

        // Find the lowest zIndex among all elements
        const allZIndexes = [
            ...this.canvasImages.map(img => img.zIndex),
            ...this.canvasTexts.map(txt => txt.zIndex)
        ];
        const minZIndex = Math.min(...allZIndexes);

        text.zIndex = minZIndex - 1;
        this.renderCanvasImages();
    },

    updateSelectedTextFont(font) {
        if (!this.selectedTextId) return;
        const text = this.canvasTexts.find(txt => txt.id === this.selectedTextId);
        if (text) {
            text.font = font;
            this.renderCanvasImages();
        }
    },

    updateSelectedTextSize(size) {
        if (!this.selectedTextId) return;
        const text = this.canvasTexts.find(txt => txt.id === this.selectedTextId);
        if (text) {
            text.size = parseInt(size);
            this.renderCanvasImages();
        }
    },

    updateSelectedTextColor(color) {
        if (!this.selectedTextId) return;
        const text = this.canvasTexts.find(txt => txt.id === this.selectedTextId);
        if (text) {
            text.color = color;
            this.renderCanvasImages();
        }
    },

    exportCarousel() {
        const numSlides = Math.max(1, Math.ceil(this.imageLibrary.length / 3));
        alert(`🎉 Ready to export ${numSlides} slide${numSlides > 1 ? 's' : ''}!\n\nIn the full version, this will download your carousel as high-resolution images (1080px) ready to post on Instagram or TikTok.`);
    },

    // ============ DRAWING TOOL FUNCTIONS ============

    initDrawingCanvas() {
        this.drawingCanvas = document.getElementById('drawingCanvas');
        if (!this.drawingCanvas) return;

        this.drawingCtx = this.drawingCanvas.getContext('2d');

        // Set canvas size to match the main canvas
        const totalWidth = this.canvasDimensions.width * this.numSlides;
        this.drawingCanvas.width = totalWidth;
        this.drawingCanvas.height = this.canvasDimensions.height;
        this.drawingCanvas.style.width = totalWidth + 'px';
        this.drawingCanvas.style.height = this.canvasDimensions.height + 'px';

        // Setup drawing event listeners
        this.setupDrawingListeners();
    },

    setupDrawingListeners() {
        if (!this.drawingCanvas) return;

        // Mouse events
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.drawingCanvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events
        this.drawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.drawingCanvas.dispatchEvent(mouseEvent);
        }, { passive: false });

        this.drawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.drawingCanvas.dispatchEvent(mouseEvent);
        }, { passive: false });

        this.drawingCanvas.addEventListener('touchend', () => {
            this.stopDrawing();
        });
    },

    selectDrawTool(tool) {
        this.drawTool = tool;

        // Update UI
        document.querySelectorAll('.draw-tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');

        // Enable/disable drawing canvas based on tool panel
        this.updateDrawingCanvasState();
    },

    updateDrawingCanvasState() {
        if (!this.drawingCanvas) return;

        // Only enable drawing when the draw panel is active
        const drawPanel = document.getElementById('panel-draw');
        if (drawPanel && drawPanel.classList.contains('active')) {
            this.drawingCanvas.classList.add('drawing-active');
        } else {
            this.drawingCanvas.classList.remove('drawing-active');
        }
    },

    updateDrawColor(color) {
        this.drawColor = color;
        document.getElementById('drawColorPicker').value = color;
    },

    updateDrawWeight(weight) {
        this.drawWeight = parseInt(weight);
        document.getElementById('drawWeightValue').textContent = weight;
    },

    updateDrawTransparency(opacity) {
        this.drawOpacity = parseInt(opacity);
        document.getElementById('drawTransparencyValue').textContent = opacity;
    },

    getCanvasCoordinates(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        const scaleX = this.drawingCanvas.width / rect.width;
        const scaleY = this.drawingCanvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    startDrawing(e) {
        this.isDrawing = true;
        const coords = this.getCanvasCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    },

    draw(e) {
        if (!this.isDrawing) return;

        const coords = this.getCanvasCoordinates(e);
        const ctx = this.drawingCtx;

        // Set drawing properties based on tool
        if (this.drawTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = this.drawWeight * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 1;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = this.drawColor;
            ctx.lineWidth = this.drawWeight;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Apply opacity
            const alpha = this.drawOpacity / 100;
            ctx.globalAlpha = alpha;

            // Different line widths for different tools
            if (this.drawTool === 'marker') {
                ctx.lineWidth = this.drawWeight * 1.5;
            } else if (this.drawTool === 'highlighter') {
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';
                ctx.lineWidth = this.drawWeight * 2;
                ctx.globalAlpha = 0.3;
            }
        }

        // Draw smooth line without overlapping opacity
        ctx.beginPath();
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        this.lastX = coords.x;
        this.lastY = coords.y;
    },

    stopDrawing() {
        this.isDrawing = false;
    },

    clearDrawing() {
        if (!this.drawingCtx) return;
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
