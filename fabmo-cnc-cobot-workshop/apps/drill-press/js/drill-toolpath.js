/**
 * Drill Press - Toolpath Generation
 * 
 * Generates OpenSBP code for various drilling operations
 */

class DrillToolpath {
    constructor(cobot) {
        this.cobot = cobot;
    }

    /**
     * Generate complete OpenSBP program for drilling
     * @param {Array} holes - Array of hole objects
     * @param {Object} config - Drilling configuration
     * @returns {string} OpenSBP program
     */
    generate(holes, config) {
        if (!holes || holes.length === 0) {
            throw new Error('No holes to drill');
        }

        const sbp = [];
        const settings = this.cobot.getGlobalSettings();
        
        // Header
        sbp.push(this._generateHeader(holes, config));
        
        // Initialization
        sbp.push(this._generateInit(config, settings));
        
        // Sort holes by proximity for efficient toolpath
        const sortedHoles = this._optimizeHoleOrder(holes);
        
        // Process each hole
        sortedHoles.forEach((hole, index) => {
            sbp.push(this._generateHoleOperation(hole, index + 1, config, settings));
        });
        
        // Footer/cleanup
        sbp.push(this.cobot.generateSBPFooter({
            safeZ: config.safeZ || settings.safeZ
        }));
        
        return sbp.join('\n');
    }

    /**
     * Generate header section
     * @private
     */
    _generateHeader(holes, config) {
        const description = `Drilling ${holes.length} hole(s)`;
        return this.cobot.generateSBPHeader(description, {
            materialThickness: config.materialThickness,
            bitDiameter: config.diameter,
            notes: `${config.type} holes, ${config.depth}" deep`
        });
    }

    /**
     * Generate initialization section
     * @private
     */
    _generateInit(config, settings) {
        const lines = [];
        
        lines.push("' === Initialization ===");
        
        // Variables
        const safeZ = config.safeZ || settings.safeZ;
        const feedRate = config.feedRate || settings.feedRate;
        const plungeRate = config.plungeRate || settings.plungeRate;
        
        lines.push(`&safeZ=${this.cobot.formatSBPNumber(safeZ)}`);
        lines.push(`&plungeRate=${this.cobot.formatSBPNumber(plungeRate)}`);
        lines.push(`&feedRate=${this.cobot.formatSBPNumber(feedRate)}`);
        lines.push(`&depth=${this.cobot.formatSBPNumber(config.depth)}`);
        lines.push('');
        
        // Set speeds
        lines.push(`MS,${this.cobot.formatSBPNumber(feedRate)},${this.cobot.formatSBPNumber(feedRate)}`);
        lines.push(`VS,,,${this.cobot.formatSBPNumber(plungeRate)}`);
        lines.push('');
        
        // Start spindle
        lines.push('C9  \' Select tool');
        lines.push('C6  \' Start spindle');
        lines.push(`PAUSE ${settings.spindleStartupTime}  \' Wait for spindle`);
        lines.push('');
        
        // Move to safe Z
        lines.push('JZ,%(safeZ)  \' Move to safe Z');
        lines.push('');
        
        return lines.join('\n');
    }

    /**
     * Generate operation for a single hole
     * @private
     */
    _generateHoleOperation(hole, holeNum, config, settings) {
        const lines = [];
        
        lines.push(`' --- Hole ${holeNum} at (${this.cobot.formatSBPNumber(hole.x)}, ${this.cobot.formatSBPNumber(hole.y)}) ---`);
        
        switch (config.type) {
            case 'through':
            case 'blind':
                lines.push(this._generatePlungeHole(hole, config));
                break;
                
            case 'pocket':
                lines.push(this._generatePocketHole(hole, config));
                break;
                
            case 'counterbore':
                lines.push(this._generateCounterboreHole(hole, config));
                break;
                
            default:
                lines.push(this._generatePlungeHole(hole, config));
        }
        
        lines.push('');
        return lines.join('\n');
    }

    /**
     * Generate simple plunge hole operation
     * @private
     */
    _generatePlungeHole(hole, config) {
        const lines = [];
        const x = this.cobot.formatSBPNumber(hole.x);
        const y = this.cobot.formatSBPNumber(hole.y);
        const depth = this.cobot.formatSBPNumber(-Math.abs(config.depth));
        
        lines.push(`J2,${x},${y}  \' Position over hole`);
        lines.push(`MZ,${depth}  \' Plunge to depth`);
        lines.push('JZ,%(safeZ)  \' Retract to safe Z');
        
        return lines.join('\n');
    }

    /**
     * Generate pocket/helical hole operation
     * @private
     */
    _generatePocketHole(hole, config) {
        const lines = [];
        const x = this.cobot.formatSBPNumber(hole.x);
        const y = this.cobot.formatSBPNumber(hole.y);
        const diameter = config.diameter;
        const depth = Math.abs(config.depth);
        
        // Calculate helical parameters
        const stepover = diameter * 0.4; // 40% stepover
        const depthPerPass = Math.min(diameter * 0.5, 0.25); // Max 1/4" per pass
        const numPasses = Math.ceil(depth / depthPerPass);
        const actualDepthPerPass = depth / numPasses;
        
        lines.push(`' Pocket hole: ${numPasses} depth passes`);
        lines.push(`J2,${x},${y}  \' Move to center`);
        
        // Helical plunge with expanding spiral
        for (let pass = 1; pass <= numPasses; pass++) {
            const currentDepth = -actualDepthPerPass * pass;
            const spiralRadius = diameter / 2;
            
            lines.push(`' Depth pass ${pass} to ${this.cobot.formatSBPNumber(currentDepth)}"`);
            
            // Move down while spiraling out
            lines.push(`M2,${x},${y},${this.cobot.formatSBPNumber(currentDepth)}`);
            
            // Circle at full diameter
            if (spiralRadius > 0) {
                const circleX = this.cobot.formatSBPNumber(parseFloat(x) + spiralRadius);
                lines.push(`M2,${circleX},${y},`);
                lines.push(`CG,${x},${y},1,0,360,1,${this.cobot.formatSBPNumber(currentDepth)}`);
            }
        }
        
        lines.push(`J2,${x},${y}  \' Return to center`);
        lines.push('JZ,%(safeZ)  \' Retract to safe Z');
        
        return lines.join('\n');
    }

    /**
     * Generate counterbore hole operation
     * @private
     */
    _generateCounterboreHole(hole, config) {
        const lines = [];
        
        // First drill the through hole
        lines.push("' Drilling pilot hole");
        lines.push(this._generatePlungeHole(hole, config));
        
        // Then pocket the counterbore
        if (config.cbDiameter && config.cbDepth) {
            lines.push('');
            lines.push("' Counterbore pocket");
            const cbConfig = {
                diameter: config.cbDiameter,
                depth: config.cbDepth,
                type: 'pocket'
            };
            lines.push(this._generatePocketHole(hole, cbConfig));
        }
        
        return lines.join('\n');
    }

    /**
     * Optimize hole drilling order using nearest-neighbor
     * @private
     */
    _optimizeHoleOrder(holes) {
        if (holes.length <= 1) return holes;
        
        const sorted = [];
        const remaining = [...holes];
        
        // Start with hole closest to origin
        let current = remaining.reduce((closest, hole) => {
            const dist = Math.sqrt(hole.x * hole.x + hole.y * hole.y);
            const closestDist = Math.sqrt(closest.x * closest.x + closest.y * closest.y);
            return dist < closestDist ? hole : closest;
        });
        
        sorted.push(current);
        remaining.splice(remaining.indexOf(current), 1);
        
        // Nearest neighbor algorithm
        while (remaining.length > 0) {
            let nearest = remaining[0];
            let nearestDist = this._distance(current, nearest);
            
            for (let i = 1; i < remaining.length; i++) {
                const dist = this._distance(current, remaining[i]);
                if (dist < nearestDist) {
                    nearest = remaining[i];
                    nearestDist = dist;
                }
            }
            
            sorted.push(nearest);
            current = nearest;
            remaining.splice(remaining.indexOf(nearest), 1);
        }
        
        return sorted;
    }

    /**
     * Calculate distance between two points
     * @private
     */
    _distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Validate hole configuration
     */
    validateConfig(config) {
        const errors = [];
        
        if (!config.diameter || config.diameter <= 0) {
            errors.push('Diameter must be greater than 0');
        }
        
        if (!config.depth || config.depth <= 0) {
            errors.push('Depth must be greater than 0');
        }
        
        if (config.type === 'counterbore') {
            if (!config.cbDiameter || config.cbDiameter <= config.diameter) {
                errors.push('Counterbore diameter must be larger than hole diameter');
            }
            if (!config.cbDepth || config.cbDepth <= 0) {
                errors.push('Counterbore depth must be greater than 0');
            }
        }
        
        return errors;
    }
}