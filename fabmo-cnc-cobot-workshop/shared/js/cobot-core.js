/**
 * CNC Cobot Workshop - Core Library
 * 
 * Provides common functionality for all workshop mini-apps including:
 * - FabMo API initialization
 * - Settings persistence and management
 * - Datum/registration coordination
 * - OpenSBP generation utilities
 * - Common UI helpers
 * 
 * @module cobot-core
 * @version 0.1.0
 * @license Apache-2.0
 */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['fabmo'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('./fabmo'));
    } else {
        root.CobotCore = factory(root.FabMoDashboard);
    }
}(this, function(FabMoDashboard) {
    'use strict';

    /**
     * Core class for CNC Cobot Workshop apps
     * @class CobotCore
     */
    class CobotCore {
        constructor(appName, version) {
            this.appName = appName || 'Unknown App';
            this.version = version || '0.1.0';
            this.fabmo = new FabMoDashboard();
            this.config = null;
            this.machineEnvelope = null;
            this.units = 'in'; // Default to inches
            this.initialized = false;
            
            // Settings storage keys
            this.STORAGE_PREFIX = 'cobot_workshop_';
            this.DATUM_KEY = this.STORAGE_PREFIX + 'datum';
            this.SETTINGS_KEY = this.STORAGE_PREFIX + 'settings';
            this.APP_SETTINGS_KEY = this.STORAGE_PREFIX + appName.toLowerCase().replace(/\s+/g, '_');
        }

        /**
         * Initialize the app with FabMo configuration
         * @returns {Promise} Resolves when initialized
         */
        async init() {
            if (this.initialized) {
                return Promise.resolve(this.config);
            }

            return new Promise((resolve, reject) => {
                this.fabmo.getConfig((err, config) => {
                    if (err) {
                        console.error('Failed to get FabMo config:', err);
                        reject(err);
                        return;
                    }
                    
                    this.config = config;
                    this.units = config.machine?.units || 'in';
                    
                    // Store machine envelope for bounds checking
                    this.machineEnvelope = {
                        xmin: config.machine?.envelope?.xmin || 0,
                        xmax: config.machine?.envelope?.xmax || 96,
                        ymin: config.machine?.envelope?.ymin || 0,
                        ymax: config.machine?.envelope?.ymax || 48,
                        zmin: config.machine?.envelope?.zmin || -6,
                        zmax: config.machine?.envelope?.zmax || 6
                    };
                    
                    this.initialized = true;
                    console.log(`${this.appName} v${this.version} initialized`);
                    resolve(config);
                });
            });
        }

        /**
         * Get current machine position
         * @returns {Promise<Object>} Position object {x, y, z, a, b, c}
         */
        async getPosition() {
            return new Promise((resolve, reject) => {
                this.fabmo.getStatus((err, status) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({
                        x: status.posx || 0,
                        y: status.posy || 0,
                        z: status.posz || 0,
                        a: status.posa || 0,
                        b: status.posb || 0,
                        c: status.posc || 0
                    });
                });
            });
        }

        // ====================================================================
        // DATUM & REGISTRATION SYSTEM
        // ====================================================================

        /**
         * Set a datum point for cross-app coordination
         * @param {Object} datum - Datum information
         * @param {number} datum.x - X coordinate
         * @param {number} datum.y - Y coordinate
         * @param {number} datum.z - Z coordinate (often 0 for material top)
         * @param {string} datum.label - Optional label
         * @param {string} datum.appName - App that set the datum
         */
        setDatum(datum) {
            const datumData = {
                x: datum.x || 0,
                y: datum.y || 0,
                z: datum.z || 0,
                label: datum.label || 'Datum',
                appName: datum.appName || this.appName,
                timestamp: Date.now(),
                units: this.units
            };
            
            localStorage.setItem(this.DATUM_KEY, JSON.stringify(datumData));
            console.log('Datum set:', datumData);
            return datumData;
        }

        /**
         * Get the current datum point
         * @returns {Object|null} Datum data or null if not set
         */
        getDatum() {
            const datumStr = localStorage.getItem(this.DATUM_KEY);
            if (!datumStr) return null;
            
            try {
                return JSON.parse(datumStr);
            } catch (e) {
                console.error('Failed to parse datum:', e);
                return null;
            }
        }

        /**
         * Clear the datum
         */
        clearDatum() {
            localStorage.removeItem(this.DATUM_KEY);
            console.log('Datum cleared');
        }

        /**
         * Set datum from current machine position
         */
        async setDatumFromCurrentPosition(label) {
            const pos = await this.getPosition();
            return this.setDatum({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                label: label || 'Current Position',
                appName: this.appName
            });
        }

        // ====================================================================
        // SETTINGS MANAGEMENT
        // ====================================================================

        /**
         * Get global workshop settings
         * @returns {Object} Global settings
         */
        getGlobalSettings() {
            const settingsStr = localStorage.getItem(this.SETTINGS_KEY);
            if (!settingsStr) {
                return this._getDefaultGlobalSettings();
            }
            
            try {
                const settings = JSON.parse(settingsStr);
                // Merge with defaults to ensure all keys exist
                return Object.assign(this._getDefaultGlobalSettings(), settings);
            } catch (e) {
                console.error('Failed to parse global settings:', e);
                return this._getDefaultGlobalSettings();
            }
        }

        /**
         * Save global workshop settings
         * @param {Object} settings - Settings to save
         */
        setGlobalSettings(settings) {
            const current = this.getGlobalSettings();
            const updated = Object.assign(current, settings);
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
            console.log('Global settings updated:', updated);
            return updated;
        }

        /**
         * Get default global settings
         * @private
         */
        _getDefaultGlobalSettings() {
            return {
                safeZ: this.config?.opensbp?.safeZ || 0.5,
                units: this.units,
                spindleStartupTime: 3, // seconds
                feedRate: 2.0, // inches per second
                plungeRate: 0.5, // inches per second
                toolDiameter: 0.25, // inches
                bitType: 'end_mill',
                preferMetric: false
            };
        }

        /**
         * Get app-specific settings
         * @returns {Object} App settings
         */
        getAppSettings() {
            const settingsStr = localStorage.getItem(this.APP_SETTINGS_KEY);
            if (!settingsStr) return {};
            
            try {
                return JSON.parse(settingsStr);
            } catch (e) {
                console.error('Failed to parse app settings:', e);
                return {};
            }
        }

        /**
         * Save app-specific settings
         * @param {Object} settings - Settings to save
         */
        setAppSettings(settings) {
            const current = this.getAppSettings();
            const updated = Object.assign(current, settings);
            localStorage.setItem(this.APP_SETTINGS_KEY, JSON.stringify(updated));
            console.log(`${this.appName} settings updated:`, updated);
            return updated;
        }

        /**
         * Clear all app settings
         */
        clearAppSettings() {
            localStorage.removeItem(this.APP_SETTINGS_KEY);
            console.log(`${this.appName} settings cleared`);
        }

        // ====================================================================
        // OPENSBP GENERATION UTILITIES
        // ====================================================================

        /**
         * Generate standard OpenSBP header
         * @param {string} description - Brief description of the operation
         * @param {Object} options - Additional header options
         * @returns {string} OpenSBP header
         */
        generateSBPHeader(description, options = {}) {
            const lines = [];
            lines.push("' ====================================================================");
            lines.push(`' CNC Cobot Workshop: ${this.appName}`);
            lines.push(`' ${description}`);
            lines.push("' ====================================================================");
            lines.push(`' Generated: ${new Date().toLocaleString()}`);
            lines.push(`' App Version: ${this.version}`);
            
            if (options.materialThickness) {
                lines.push(`' Material Thickness: ${options.materialThickness} ${this.units}`);
            }
            if (options.bitDiameter) {
                lines.push(`' Bit Diameter: ${options.bitDiameter} ${this.units}`);
            }
            if (options.notes) {
                lines.push(`' Notes: ${options.notes}`);
            }
            
            lines.push("'");
            return lines.join('\n');
        }

        /**
         * Generate standard OpenSBP initialization sequence
         * @param {Object} options - Options for initialization
         * @returns {string} OpenSBP initialization code
         */
        generateSBPInit(options = {}) {
            const settings = this.getGlobalSettings();
            const safeZ = options.safeZ || settings.safeZ;
            const spindleDelay = options.spindleDelay || settings.spindleStartupTime;
            
            const lines = [];
            lines.push("' Initialization");
            lines.push(`&safeZ=${safeZ.toFixed(3)}`);
            
            if (options.feedRate) {
                lines.push(`MS,${options.feedRate.toFixed(3)},${options.feedRate.toFixed(3)}`);
            }
            if (options.plungeRate) {
                lines.push(`VS,,,${options.plungeRate.toFixed(3)}`);
            }
            
            if (options.startSpindle !== false) {
                lines.push('C9  \' Select tool');
                lines.push('C6  \' Spindle on');
                lines.push(`PAUSE ${spindleDelay}  \' Wait for spindle to reach speed`);
            }
            
            lines.push(`JZ,%(safeZ)  \' Move to safe Z`);
            lines.push('');
            
            return lines.join('\n');
        }

        /**
         * Generate standard OpenSBP cleanup/footer sequence
         * @param {Object} options - Options for cleanup
         * @returns {string} OpenSBP cleanup code
         */
        generateSBPFooter(options = {}) {
            const settings = this.getGlobalSettings();
            const safeZ = options.safeZ || settings.safeZ;
            const returnHome = options.returnHome !== false;
            
            const lines = [];
            lines.push('');
            lines.push("' Cleanup");
            lines.push(`JZ,${safeZ.toFixed(3)}  \' Return to safe Z`);
            lines.push('C7  \' Spindle off');
            
            if (returnHome) {
                lines.push('J2,0,0  \' Return to home position');
            }
            
            lines.push('END');
            return lines.join('\n');
        }

        /**
         * Format a number for OpenSBP output
         * @param {number} value - Value to format
         * @param {number} decimals - Number of decimal places (default 3)
         * @returns {string} Formatted number
         */
        formatSBPNumber(value, decimals = 3) {
            return value.toFixed(decimals);
        }

        // ====================================================================
        // JOB MANAGEMENT
        // ====================================================================

        /**
         * Submit an OpenSBP job to FabMo
         * @param {string} sbpCode - OpenSBP code to run
         * @param {Object} options - Job options
         * @returns {Promise} Resolves when job is submitted
         */
        async submitJob(sbpCode, options = {}) {
            const jobOptions = {
                name: options.name || `${this.appName} Job`,
                description: options.description || '',
                compressed: false
            };

            return new Promise((resolve, reject) => {
                this.fabmo.submitJob(sbpCode, jobOptions, (err, result) => {
                    if (err) {
                        console.error('Failed to submit job:', err);
                        reject(err);
                        return;
                    }
                    console.log('Job submitted:', result);
                    resolve(result);
                });
            });
        }

        /**
         * Run an OpenSBP job immediately
         * @param {string} sbpCode - OpenSBP code to run
         * @param {Object} options - Job options
         * @returns {Promise} Resolves when job starts
         */
        async runJob(sbpCode, options = {}) {
            const result = await this.submitJob(sbpCode, options);
            
            return new Promise((resolve, reject) => {
                this.fabmo.runNext((err) => {
                    if (err) {
                        console.error('Failed to run job:', err);
                        reject(err);
                        return;
                    }
                    resolve(result);
                });
            });
        }

        // ====================================================================
        // UTILITY FUNCTIONS
        // ====================================================================

        /**
         * Check if a point is within machine envelope
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {number} z - Z coordinate
         * @returns {boolean} True if within bounds
         */
        isWithinEnvelope(x, y, z) {
            if (!this.machineEnvelope) return true; // No bounds checking if not initialized
            
            return (
                x >= this.machineEnvelope.xmin && x <= this.machineEnvelope.xmax &&
                y >= this.machineEnvelope.ymin && y <= this.machineEnvelope.ymax &&
                z >= this.machineEnvelope.zmin && z <= this.machineEnvelope.zmax
            );
        }

        /**
         * Get safe Z height
         * @returns {number} Safe Z coordinate
         */
        getSafeZ() {
            const settings = this.getGlobalSettings();
            return settings.safeZ;
        }

        /**
         * Show a notification to the user
         * @param {string} message - Message to display
         * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
         */
        notify(message, type = 'info') {
            const methodMap = {
                'info': 'notify',
                'success': 'notifySuccess',
                'warning': 'notifyWarning',
                'error': 'notifyError'
            };
            
            const method = methodMap[type] || 'notify';
            if (this.fabmo[method]) {
                this.fabmo[method](message);
            } else {
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        }

        /**
         * Request manual/jog mode entry
         */
        requestManualMode() {
            this.fabmo.requestManual();
        }

        /**
         * Exit manual/jog mode
         */
        releaseManualMode() {
            this.fabmo.releaseManual();
        }
    }

    return CobotCore;
}));