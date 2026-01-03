/**
 * Drill Press - UI Management
 * 
 * Handles canvas visualization, user interactions, and UI state
 */

class DrillPressUI {
    constructor(cobot) {
        this.cobot = cobot;
        this.canvas = document.getElementById('workpiece-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.holes = [];
        this.selectedHoleIndex = -1;
        this.clickModeEnabled = false;
        this.gridSize = 1; // 1 inch grid
        this.scale = 10; // pixels per inch
        this.originX = 50; // Canvas origin offset
        this.originY = 550; // Canvas origin offset (inverted Y)
        
        this._setupCanvas();
        this._bindCanvasEvents();
        
        // Add undo/redo functionality
        this.addUndoRedo();
    }

    /**
     * Setup canvas dimensions and coordinate system
     * @private
     */
    _setupCanvas() {
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Calculate visible work area in inches
        this.workWidth = (this.canvas.width - this.originX * 2) / this.scale;
        this.workHeight = (this.canvas.height - this.originY + 500) / this.scale;
        
        this.draw();
    }

    /**
     * Bind canvas interaction events
     * @private
     */
    _bindCanvasEvents() {
        this.canvas.addEventListener('click', (e) => {
            if (this.clickModeEnabled) {
                this._handleCanvasClick(e);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.clickModeEnabled) {
                this._handleCanvasHover(e);
            }
        });
    }

    /**
     * Handle canvas click for manual hole placement
     * @private
     */
    _handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert canvas coordinates to work coordinates
        const workCoords = this._canvasToWork(x, y);
        
        // Validate coordinates are within machine envelope
        if (this.cobot.machineEnvelope) {
            if (workCoords.x < this.cobot.machineEnvelope.xmin || 
                workCoords.x > this.cobot.machineEnvelope.xmax ||
                workCoords.y < this.cobot.machineEnvelope.ymin || 
                workCoords.y > this.cobot.machineEnvelope.ymax) {
                this.cobot.notify('Position outside machine envelope', 'warning');
                return;
            }
        }
        
        // Add hole at clicked position
        this.addHole(workCoords.x, workCoords.y);
        this.cobot.notify(`Hole added at (${workCoords.x.toFixed(3)}, ${workCoords.y.toFixed(3)})`, 'success');
    }

    /**
     * Handle canvas hover for cursor feedback
     * @private
     */
    _handleCanvasHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const workCoords = this._canvasToWork(x, y);
        
        // Update canvas info overlay
        const overlay = document.getElementById('canvas-info');
        if (overlay) {
            const coordDisplay = overlay.querySelector('#coord-display');
            if (!coordDisplay) {
                const div = document.createElement('div');
                div.id = 'coord-display';
                overlay.appendChild(div);
            }
            document.getElementById('coord-display').innerHTML = 
                `<strong>Cursor:</strong> X=${workCoords.x.toFixed(3)}, Y=${workCoords.y.toFixed(3)}`;
        }
        
        // Redraw with cursor position
        this.draw();
        this._drawCursor(x, y);
    }

    /**
     * Convert canvas coordinates to work coordinates
     * @private
     */
    _canvasToWork(canvasX, canvasY) {
        const x = (canvasX - this.originX) / this.scale;
        const y = (this.originY - canvasY) / this.scale; // Invert Y
        
        return {
            x: Math.round(x * 1000) / 1000, // Round to 3 decimal places
            y: Math.round(y * 1000) / 1000
        };
    }

    /**
     * Convert work coordinates to canvas coordinates
     * @private
     */
    _workToCanvas(workX, workY) {
        return {
            x: this.originX + (workX * this.scale),
            y: this.originY - (workY * this.scale) // Invert Y
        };
    }

    /**
     * Main drawing function
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this._drawGrid();
        this._drawAxes();
        this._drawDatum();
        this._drawHoles();
        this._drawMachineEnvelope();
    }

    /**
     * Draw coordinate grid
     * @private
     */
    _drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let i = 0; i <= this.workWidth; i += this.gridSize) {
            const canvasCoords = this._workToCanvas(i, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(canvasCoords.x, 0);
            this.ctx.lineTo(canvasCoords.x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= this.workHeight; i += this.gridSize) {
            const canvasCoords = this._workToCanvas(0, i);
            this.ctx.beginPath();
            this.ctx.moveTo(0, canvasCoords.y);
            this.ctx.lineTo(this.canvas.width, canvasCoords.y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw coordinate axes
     * @private
     */
    _drawAxes() {
        this.ctx.strokeStyle = '#2c5f2d';
        this.ctx.lineWidth = 2;
        
        // X axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.originX, this.originY);
        this.ctx.lineTo(this.canvas.width - 50, this.originY);
        this.ctx.stroke();
        
        // X axis arrow
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 60, this.originY - 5);
        this.ctx.lineTo(this.canvas.width - 50, this.originY);
        this.ctx.lineTo(this.canvas.width - 60, this.originY + 5);
        this.ctx.stroke();
        
        // Y axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.originX, this.originY);
        this.ctx.lineTo(this.originX, 50);
        this.ctx.stroke();
        
        // Y axis arrow
        this.ctx.beginPath();
        this.ctx.moveTo(this.originX - 5, 60);
        this.ctx.lineTo(this.originX, 50);
        this.ctx.lineTo(this.originX + 5, 60);
        this.ctx.stroke();
        
        // Axis labels
        this.ctx.fillStyle = '#2c5f2d';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText('X', this.canvas.width - 40, this.originY + 20);
        this.ctx.fillText('Y', this.originX - 20, 40);
        
        // Origin label
        this.ctx.fillText('(0,0)', this.originX - 30, this.originY + 20);
    }

    /**
     * Draw datum point if set
     * @private
     */
    _drawDatum() {
        const datum = this.cobot.getDatum();
        if (!datum) return;
        
        const canvasCoords = this._workToCanvas(datum.x, datum.y);
        
        // Draw datum marker
        this.ctx.fillStyle = '#f4a259';
        this.ctx.strokeStyle = '#d8793f';
        this.ctx.lineWidth = 2;
        
        // Diamond shape
        this.ctx.beginPath();
        this.ctx.moveTo(canvasCoords.x, canvasCoords.y - 10);
        this.ctx.lineTo(canvasCoords.x + 10, canvasCoords.y);
        this.ctx.lineTo(canvasCoords.x, canvasCoords.y + 10);
        this.ctx.lineTo(canvasCoords.x - 10, canvasCoords.y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Label
        this.ctx.fillStyle = '#d8793f';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('DATUM', canvasCoords.x + 15, canvasCoords.y + 5);
    }

    /**
     * Draw all holes
     * @private
     */
    _drawHoles() {
        this.holes.forEach((hole, index) => {
            this._drawHole(hole, index === this.selectedHoleIndex);
        });
    }

    /**
     * Draw a single hole
     * @private
     */
    _drawHole(hole, isSelected) {
        const canvasCoords = this._workToCanvas(hole.x, hole.y);
        const diameter = hole.diameter || 0.25;
        const radius = (diameter / 2) * this.scale;
        
        // Draw hole circle
        this.ctx.beginPath();
        this.ctx.arc(canvasCoords.x, canvasCoords.y, radius, 0, Math.PI * 2);
        
        if (isSelected) {
            this.ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
            this.ctx.strokeStyle = '#2e6bb8';
            this.ctx.lineWidth = 3;
        } else {
            this.ctx.fillStyle = 'rgba(44, 95, 45, 0.2)';
            this.ctx.strokeStyle = '#2c5f2d';
            this.ctx.lineWidth = 2;
        }
        
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw center crosshair
        this.ctx.strokeStyle = isSelected ? '#2e6bb8' : '#2c5f2d';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(canvasCoords.x - 5, canvasCoords.y);
        this.ctx.lineTo(canvasCoords.x + 5, canvasCoords.y);
        this.ctx.moveTo(canvasCoords.x, canvasCoords.y - 5);
        this.ctx.lineTo(canvasCoords.x, canvasCoords.y + 5);
        this.ctx.stroke();
        
        // Draw hole number
        this.ctx.fillStyle = isSelected ? '#2e6bb8' : '#2c5f2d';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(hole.number || '', canvasCoords.x, canvasCoords.y - radius - 5);
        this.ctx.textAlign = 'left';
    }

    /**
     * Draw machine envelope boundary
     * @private
     */
    _drawMachineEnvelope() {
        if (!this.cobot.machineEnvelope) return;
        
        const env = this.cobot.machineEnvelope;
        const topLeft = this._workToCanvas(env.xmin, env.ymax);
        const bottomRight = this._workToCanvas(env.xmax, env.ymin);
        
        this.ctx.strokeStyle = '#ff9800';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.strokeRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y
        );
        
        this.ctx.setLineDash([]);
        
        // Label
        this.ctx.fillStyle = '#ff9800';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('Machine Envelope', topLeft.x + 5, topLeft.y + 15);
    }

    /**
     * Draw cursor position indicator
     * @private
     */
    _drawCursor(canvasX, canvasY) {
        this.ctx.strokeStyle = '#4a90e2';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        
        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(canvasX, 0);
        this.ctx.lineTo(canvasX, this.canvas.height);
        this.ctx.stroke();
        
        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(0, canvasY);
        this.ctx.lineTo(this.canvas.width, canvasY);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    /**
     * Add a hole to the list
     */
    addHole(x, y, config = {}) {
        const hole = {
            x: x,
            y: y,
            diameter: config.diameter || parseFloat(document.getElementById('hole-diameter').value),
            depth: config.depth || parseFloat(document.getElementById('hole-depth').value),
            type: config.type || document.getElementById('hole-type').value,
            number: this.holes.length + 1
        };
        
        this.holes.push(hole);
        this.updateHoleList();
        this.draw();
        
        // Save state after adding hole
        this.saveState();
        
        return hole;
    }

    /**
     * Remove a hole by index
     */
    removeHole(index) {
        this.holes.splice(index, 1);
        
        // Renumber holes
        this.holes.forEach((hole, i) => {
            hole.number = i + 1;
        });
        
        this.selectedHoleIndex = -1;
        this.updateHoleList();
        this.draw();
        
        // Save state after removing hole
        this.saveState();
    }

    /**
     * Clear all holes
     */
    clearAllHoles() {
        this.holes = [];
        this.selectedHoleIndex = -1;
        this.updateHoleList();
        this.draw();
        
        // Save state after clearing holes
        this.saveState();
    }

    /**
     * Generate array of holes
     */
    generateArray(rows, cols, spacingX, spacingY, originX, originY) {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = originX + (col * spacingX);
                const y = originY + (row * spacingY);
                this.addHole(x, y);
            }
        }
        
        this.cobot.notify(`Generated ${rows * cols} hole array`, 'success');
        
        // Save state after generating array
        this.saveState();
    }

    /**
     * Generate circular pattern of holes
     */
    generateCirclePattern(count, radius, centerX, centerY, startAngle = 0) {
        const angleStep = 360 / count;
        
        for (let i = 0; i < count; i++) {
            const angle = (startAngle + (i * angleStep)) * Math.PI / 180;
            const x = centerX + (radius * Math.cos(angle));
            const y = centerY + (radius * Math.sin(angle));
            this.addHole(x, y);
        }
        
        this.cobot.notify(`Generated ${count} hole circle pattern`, 'success');
        
        // Save state after generating circle pattern
        this.saveState();
    }

    /**
     * Update the hole list display
     */
    updateHoleList() {
        const listContainer = document.getElementById('hole-list');
        const countDisplay = document.getElementById('hole-count');
        const listCountDisplay = document.getElementById('hole-list-count');
        
        // Update counts
        countDisplay.textContent = this.holes.length;
        listCountDisplay.textContent = this.holes.length;
        
        // Clear existing list
        listContainer.innerHTML = '';
        
        if (this.holes.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-muted">No holes defined yet. Add holes using the methods above.</p>';
            return;
        }
        
        // Create hole list items
        this.holes.forEach((hole, index) => {
            const item = document.createElement('div');
            item.className = 'hole-item';
            if (index === this.selectedHoleIndex) {
                item.classList.add('selected');
            }
            
            item.innerHTML = `
                <div class="hole-info">
                    <span><strong>#${hole.number}</strong></span>
                    <span>X: ${hole.x.toFixed(3)}"</span>
                    <span>Y: ${hole.y.toFixed(3)}"</span>
                    <span>⌀ ${hole.diameter}"</span>
                    <span>↓ ${hole.depth}"</span>
                </div>
                <div class="hole-actions">
                    <button class="btn-sm btn-accent" data-action="select" data-index="${index}">Select</button>
                    <button class="btn-sm btn-outline" data-action="delete" data-index="${index}">Delete</button>
                </div>
            `;
            
            listContainer.appendChild(item);
        });
        
        // Bind actions
        listContainer.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const index = parseInt(e.target.dataset.index);
                
                if (action === 'select') {
                    this.selectedHoleIndex = index;
                    this.updateHoleList();
                    this.draw();
                } else if (action === 'delete') {
                    this.removeHole(index);
                }
            });
        });
    }

    /**
     * Toggle click mode for manual hole placement
     */
    toggleClickMode() {
        this.clickModeEnabled = !this.clickModeEnabled;
        
        if (this.clickModeEnabled) {
            this.canvas.classList.add('click-mode');
        } else {
            this.canvas.classList.remove('click-mode');
        }
        
        return this.clickModeEnabled;
    }

    /**
     * Get all holes
     */
    getHoles() {
        return this.holes;
    }

    /**
     * Load holes from saved data
     */
    loadHoles(holesData) {
        this.holes = holesData.map((hole, index) => ({
            ...hole,
            number: index + 1
        }));
        this.updateHoleList();
        this.draw();
    }

    /**
     * Update datum display
     */
    updateDatumDisplay() {
        const datum = this.cobot.getDatum();
        const statusSpan = document.getElementById('datum-status');
        const displayDiv = document.getElementById('datum-display');
        
        if (datum) {
            statusSpan.textContent = `(${datum.x.toFixed(3)}, ${datum.y.toFixed(3)}, ${datum.z.toFixed(3)})`;
            displayDiv.classList.remove('hidden');
            
            document.getElementById('datum-x').textContent = datum.x.toFixed(3);
            document.getElementById('datum-y').textContent = datum.y.toFixed(3);
            document.getElementById('datum-z').textContent = datum.z.toFixed(3);
        } else {
            statusSpan.textContent = 'Not Set';
            displayDiv.classList.add('hidden');
        }
        
        this.draw();
    }

    /**
     * Add undo/redo functionality
     */
    addUndoRedo() {
        this.history = [];
        this.historyIndex = -1;
        
        // Store state after each change
        this.saveState = () => {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(JSON.parse(JSON.stringify(this.holes)));
            this.historyIndex++;
        };
        
        // Undo last action
        this.undo = () => {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.holes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
                this.render();
            }
        };
        
        // Redo last undone action
        this.redo = () => {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.holes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
                this.render();
            }
        };
    }

    /**
     * Add real-time validation feedback
     */
    validateConfiguration() {
        const diameter = parseFloat(document.getElementById('hole-diameter').value);
        const depth = parseFloat(document.getElementById('hole-depth').value);
        const warnings = [];
        
        // Check against machine capabilities
        if (this.cobot.config) {
            const envelope = this.cobot.machineEnvelope;
            
            if (depth > Math.abs(envelope.zmin)) {
                warnings.push(`Depth exceeds Z travel (${Math.abs(envelope.zmin)}")`);
            }
        }
        
        // Check for reasonable values
        if (diameter > 3.0) {
            warnings.push('Large diameter - consider using pocket mode');
        }
        
        if (depth / diameter > 3) {
            warnings.push('Deep hole - may need peck drilling');
        }
        
        return warnings;
    }
}