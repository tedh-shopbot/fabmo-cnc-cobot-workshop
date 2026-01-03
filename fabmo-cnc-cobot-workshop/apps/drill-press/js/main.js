/**
 * Drill Press - Main Application
 * 
 * Entry point and application orchestration
 */

(function() {
    'use strict';
    
    // Global instances
    let cobot;
    let ui;
    let toolpath;
    
    /**
     * Initialize the application
     */
    async function init() {
        try {
            // Initialize cobot core
            cobot = new CobotCore('Drill Press', '1.0.0');
            await cobot.init();
            
            console.log('Drill Press initialized with FabMo config');
            
            // Initialize UI and toolpath
            ui = new DrillPressUI(cobot);
            toolpath = new DrillToolpath(cobot);
            
            // Load saved state
            loadAppState();
            
            // Setup event listeners
            setupEventListeners();
            
            // Update datum display
            ui.updateDatumDisplay();
            
            cobot.notify('Drill Press ready!', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Failed to initialize Drill Press: ' + error.message);
        }
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', handleTabSwitch);
        });
        
        // Hole type change
        document.getElementById('hole-type').addEventListener('change', handleHoleTypeChange);
        
        // Single hole controls
        document.getElementById('use-current-position').addEventListener('click', handleUseCurrentPosition);
        document.getElementById('add-single-hole').addEventListener('click', handleAddSingleHole);
        
        // Array generation
        document.getElementById('generate-array').addEventListener('click', handleGenerateArray);
        
        // Pattern generation
        document.getElementById('pattern-type').addEventListener('change', handlePatternTypeChange);
        document.getElementById('generate-pattern').addEventListener('click', handleGeneratePattern);
        
        // Manual click mode
        document.getElementById('toggle-click-mode').addEventListener('click', handleToggleClickMode);
        
        // Hole list management
        document.getElementById('clear-all-holes').addEventListener('click', handleClearAllHoles);
        document.getElementById('save-hole-list').addEventListener('click', handleSaveHoleList);
        
        // Datum controls
        document.getElementById('set-datum-current').addEventListener('click', handleSetDatumCurrent);
        document.getElementById('set-datum-zero').addEventListener('click', handleSetDatumZero);
        document.getElementById('clear-datum').addEventListener('click', handleClearDatum);
        
        // Action buttons
        document.getElementById('preview-toolpath').addEventListener('click', handlePreviewToolpath);
        document.getElementById('save-job').addEventListener('click', handleSaveJob);
        document.getElementById('drill-now').addEventListener('click', handleDrillNow);
        
        // Modal controls
        document.querySelectorAll('.modal-close, #close-preview').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        document.getElementById('copy-toolpath').addEventListener('click', handleCopyToolpath);
        
        // Settings and help
        document.getElementById('show-settings')?.addEventListener('click', handleShowSettings);
        document.getElementById('show-help')?.addEventListener('click', handleShowHelp);
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                ui.undo();
            }
            
            // Ctrl/Cmd + Shift + Z for redo
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
                e.preventDefault();
                ui.redo();
            }
            
            // Delete key to remove selected hole
            if (e.key === 'Delete' && ui.selectedHole !== null) {
                ui.deleteHole(ui.selectedHole);
            }
        });
    }

    /**
     * Handle tab switching
     */
    function handleTabSwitch(e) {
        const method = e.target.dataset.method;
        
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(`${method}-method`).classList.add('active');
        
        // Disable click mode when switching away from manual
        if (method !== 'manual' && ui.clickModeEnabled) {
            ui.toggleClickMode();
            document.getElementById('toggle-click-mode').textContent = 'Enable Click Mode';
        }
    }

    /**
     * Handle hole type change (show/hide counterbore settings)
     */
    function handleHoleTypeChange(e) {
        const cbSettings = document.getElementById('counterbore-settings');
        if (e.target.value === 'counterbore') {
            cbSettings.classList.remove('hidden');
        } else {
            cbSettings.classList.add('hidden');
        }
    }

    /**
     * Handle pattern type change
     */
    function handlePatternTypeChange(e) {
        // Could show/hide different settings based on pattern type
        // For now, circle pattern settings work for all
    }

    /**
     * Use current machine position for single hole
     */
    async function handleUseCurrentPosition() {
        try {
            const pos = await cobot.getPosition();
            document.getElementById('single-x').value = pos.x.toFixed(3);
            document.getElementById('single-y').value = pos.y.toFixed(3);
            cobot.notify('Position updated from machine', 'success');
        } catch (error) {
            console.error('Failed to get position:', error);
            cobot.notify('Failed to get current position', 'error');
        }
    }

    /**
     * Add a single hole
     */
    function handleAddSingleHole() {
        const x = parseFloat(document.getElementById('single-x').value);
        const y = parseFloat(document.getElementById('single-y').value);
        
        if (isNaN(x) || isNaN(y)) {
            cobot.notify('Invalid coordinates', 'error');
            return;
        }
        
        ui.addHole(x, y);
        cobot.notify('Hole added', 'success');
    }

    /**
     * Generate hole array
     */
    function handleGenerateArray() {
        const rows = parseInt(document.getElementById('array-rows').value);
        const cols = parseInt(document.getElementById('array-cols').value);
        const spacingX = parseFloat(document.getElementById('array-spacing-x').value);
        const spacingY = parseFloat(document.getElementById('array-spacing-y').value);
        const originX = parseFloat(document.getElementById('array-origin-x').value);
        const originY = parseFloat(document.getElementById('array-origin-y').value);
        
        if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
            cobot.notify('Invalid array dimensions', 'error');
            return;
        }
        
        if (isNaN(spacingX) || isNaN(spacingY) || spacingX <= 0 || spacingY <= 0) {
            cobot.notify('Invalid spacing values', 'error');
            return;
        }
        
        ui.generateArray(rows, cols, spacingX, spacingY, originX, originY);
    }

    /**
     * Generate hole pattern
     */
    function handleGeneratePattern() {
        const patternType = document.getElementById('pattern-type').value;
        const count = parseInt(document.getElementById('pattern-count').value);
        const radius = parseFloat(document.getElementById('pattern-radius').value);
        const centerX = parseFloat(document.getElementById('pattern-center-x').value);
        const centerY = parseFloat(document.getElementById('pattern-center-y').value);
        const startAngle = parseFloat(document.getElementById('pattern-start-angle').value);
        
        if (isNaN(count) || count < 2) {
            cobot.notify('Invalid hole count', 'error');
            return;
        }
        
        if (isNaN(radius) || radius <= 0) {
            cobot.notify('Invalid radius', 'error');
            return;
        }
        
        if (patternType === 'circle' || patternType === 'arc') {
            ui.generateCirclePattern(count, radius, centerX, centerY, startAngle);
        }
        // Add other pattern types as needed
    }

    /**
     * Toggle manual click mode
     */
    function handleToggleClickMode() {
        const enabled = ui.toggleClickMode();
        const btn = document.getElementById('toggle-click-mode');
        
        if (enabled) {
            btn.textContent = 'Disable Click Mode';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-accent');
            cobot.notify('Click on canvas to place holes', 'info');
        } else {
            btn.textContent = 'Enable Click Mode';
            btn.classList.remove('btn-accent');
            btn.classList.add('btn-secondary');
        }
    }

    /**
     * Clear all holes
     */
    function handleClearAllHoles() {
        if (ui.getHoles().length === 0) return;
        
        if (confirm('Clear all holes?')) {
            ui.clearAllHoles();
            cobot.notify('All holes cleared', 'info');
        }
    }

    /**
     * Save hole list to app settings
     */
    function handleSaveHoleList() {
        const holes = ui.getHoles();
        if (holes.length === 0) {
            cobot.notify('No holes to save', 'warning');
            return;
        }
        
        cobot.setAppSettings({
            savedHoles: holes,
            savedAt: new Date().toISOString()
        });
        
        cobot.notify(`Saved ${holes.length} holes`, 'success');
    }

    /**
     * Set datum from current position
     */
    async function handleSetDatumCurrent() {
        try {
            await cobot.setDatumFromCurrentPosition('Drill Press Work Origin');
            ui.updateDatumDisplay();
            cobot.notify('Datum set from current position', 'success');
        } catch (error) {
            console.error('Failed to set datum:', error);
            cobot.notify('Failed to set datum', 'error');
        }
    }

    /**
     * Set datum to 0,0,0
     */
    function handleSetDatumZero() {
        cobot.setDatum({
            x: 0,
            y: 0,
            z: 0,
            label: 'Machine Zero',
            appName: 'Drill Press'
        });
        ui.updateDatumDisplay();
        cobot.notify('Datum set to 0,0,0', 'success');
    }

    /**
     * Clear datum
     */
    function handleClearDatum() {
        cobot.clearDatum();
        ui.updateDatumDisplay();
        cobot.notify('Datum cleared', 'info');
    }

    /**
     * Preview generated toolpath
     */
    function handlePreviewToolpath() {
        const holes = ui.getHoles();
        if (holes.length === 0) {
            cobot.notify('No holes to preview', 'warning');
            return;
        }
        
        try {
            const config = getHoleConfig();
            const errors = toolpath.validateConfig(config);
            
            if (errors.length > 0) {
                cobot.notify('Configuration errors: ' + errors.join(', '), 'error');
                return;
            }
            
            const sbpCode = toolpath.generate(holes, config);
            
            // Show in modal
            document.getElementById('toolpath-preview-content').textContent = sbpCode;
            document.getElementById('preview-modal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Preview error:', error);
            cobot.notify('Failed to generate preview: ' + error.message, 'error');
        }
    }

    /**
     * Save job to FabMo
     */
    async function handleSaveJob() {
        const holes = ui.getHoles();
        if (holes.length === 0) {
            cobot.notify('No holes to save', 'warning');
            return;
        }
        
        try {
            const config = getHoleConfig();
            const errors = toolpath.validateConfig(config);
            
            if (errors.length > 0) {
                cobot.notify('Configuration errors: ' + errors.join(', '), 'error');
                return;
            }
            
            const sbpCode = toolpath.generate(holes, config);
            
            await cobot.submitJob(sbpCode, {
                name: `Drill Press - ${holes.length} holes`,
                description: `${config.type} holes, ${config.diameter}" dia, ${config.depth}" deep`
            });
            
            cobot.notify('Job saved successfully', 'success');
            
        } catch (error) {
            console.error('Save error:', error);
            cobot.notify('Failed to save job: ' + error.message, 'error');
        }
    }

    /**
     * Run drilling operation now
     */
    async function handleDrillNow() {
        const holes = ui.getHoles();
        if (holes.length === 0) {
            cobot.notify('No holes to drill', 'warning');
            return;
        }
        
        const confirmed = confirm(
            `Ready to drill ${holes.length} hole(s)?\n\n` +
            `Make sure:\n` +
            `- Material is secured\n` +
            `- Bit is installed and zeroed\n` +
            `- Safety equipment is in place\n\n` +
            `Continue?`
        );
        
        if (!confirmed) return;
        
        try {
            const config = getHoleConfig();
            const errors = toolpath.validateConfig(config);
            
            if (errors.length > 0) {
                cobot.notify('Configuration errors: ' + errors.join(', '), 'error');
                return;
            }
            
            const sbpCode = toolpath.generate(holes, config);
            
            await cobot.runJob(sbpCode, {
                name: `Drill Press - ${holes.length} holes`,
                description: `${config.type} holes, ${config.diameter}" dia, ${config.depth}" deep`
            });
            
            cobot.notify('Drilling started!', 'success');
            
        } catch (error) {
            console.error('Drill error:', error);
            cobot.notify('Failed to start drilling: ' + error.message, 'error');
        }
    }

    /**
     * Copy toolpath to clipboard
     */
    function handleCopyToolpath() {
        const code = document.getElementById('toolpath-preview-content').textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            cobot.notify('Toolpath copied to clipboard', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            cobot.notify('Failed to copy to clipboard', 'error');
        });
    }

    /**
     * Close modal
     */
    function closeModal() {
        document.getElementById('preview-modal').classList.add('hidden');
    }

    /**
     * Show settings (placeholder)
     */
    function handleShowSettings() {
        alert('Settings panel coming soon!');
    }

    /**
     * Show help (placeholder)
     */
    function handleShowHelp() {
        const helpText = `
Drill Press - Quick Guide

ADDING HOLES:
- Single: Enter X,Y coordinates or use current position
- Array: Specify rows, columns, and spacing
- Pattern: Create circular or arc patterns
- Manual: Enable click mode and click on canvas

HOLE TYPES:
- Through/Blind: Simple plunge operation
- Pocket: Helical interpolation for larger holes
- Counterbore: Combines through hole with pocket

DATUM:
- Set work origin for coordinate reference
- Can be set from current position or manually
- Shared across all Cobot Workshop apps

WORKFLOW:
1. Set datum (optional but recommended)
2. Add holes using preferred method
3. Preview toolpath to verify
4. Save job or run immediately
        `.trim();
        
        alert(helpText);
    }

    /**
     * Get current hole configuration from form
     */
    function getHoleConfig() {
        const config = {
            diameter: parseFloat(document.getElementById('hole-diameter').value),
            depth: parseFloat(document.getElementById('hole-depth').value),
            type: document.getElementById('hole-type').value,
            plungeRate: parseFloat(document.getElementById('plunge-rate').value)
        };
        
        if (config.type === 'counterbore') {
            config.cbDiameter = parseFloat(document.getElementById('cb-diameter').value);
            config.cbDepth = parseFloat(document.getElementById('cb-depth').value);
        }
        
        return config;
    }

    /**
     * Load saved application state
     */
    function loadAppState() {
        const appSettings = cobot.getAppSettings();
        
        if (appSettings.savedHoles && appSettings.savedHoles.length > 0) {
            const loadSaved = confirm(
                `Found ${appSettings.savedHoles.length} saved holes from ${new Date(appSettings.savedAt).toLocaleString()}.\n\nLoad them?`
            );
            
            if (loadSaved) {
                ui.loadHoles(appSettings.savedHoles);
                cobot.notify('Loaded saved holes', 'success');
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();