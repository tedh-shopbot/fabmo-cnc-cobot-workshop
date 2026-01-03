/**
 * FabMo CNC Cobot Workshop - Build Script
 * 
 * Packages individual mini-apps or the entire workshop into .fma files
 * 
 * Usage:
 *   node build.js [app-name]
 *   node build.js all
 *   node build.js drill-press
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const APPS = {
    'drill-press': {
        name: 'Drill Press',
        dir: 'apps/drill-press',
        version: '1.0.0'
    },
    'rip-saw': {
        name: 'Rip Saw',
        dir: 'apps/rip-saw',
        version: '1.0.0'
    },
    'chop-saw': {
        name: 'Chop Saw',
        dir: 'apps/chop-saw',
        version: '1.0.0'
    }
};

const SHARED_DIR = 'shared';
const BUILD_DIR = 'build';

/**
 * Build a single app
 */
function buildApp(appKey) {
    return new Promise((resolve, reject) => {
        const app = APPS[appKey];
        if (!app) {
            reject(new Error(`Unknown app: ${appKey}`));
            return;
        }

        const appDir = path.join(__dirname, app.dir);
        const outputFile = path.join(__dirname, BUILD_DIR, `fabmo-${appKey}_v${app.version}.fma`);
        
        console.log(`\nBuilding ${app.name}...`);
        console.log(`  Source: ${app.dir}`);
        console.log(`  Output: ${outputFile}`);

        // Ensure build directory exists
        if (!fs.existsSync(path.join(__dirname, BUILD_DIR))) {
            fs.mkdirSync(path.join(__dirname, BUILD_DIR), { recursive: true });
        }

        // Create output stream
        const output = fs.createWriteStream(outputFile);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Handle stream events
        output.on('close', () => {
            const sizeKB = (archive.pointer() / 1024).toFixed(2);
            console.log(`  ✓ Built successfully (${sizeKB} KB)`);
            resolve();
        });

        output.on('error', (err) => {
            reject(err);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('  Warning:', err);
            } else {
                reject(err);
            }
        });

        // Pipe archive to output file
        archive.pipe(output);

        // Add app-specific files to root of archive
        console.log(`  Adding app files from ${app.dir}...`);
        
        // Add files directly to root, not in a subdirectory
        archive.directory(appDir, false);

        // Add shared resources
        console.log(`  Adding shared resources...`);
        const sharedDir = path.join(__dirname, SHARED_DIR);
        
        if (fs.existsSync(sharedDir)) {
            // Add shared JS files to js/ directory
            const sharedJsDir = path.join(sharedDir, 'js');
            if (fs.existsSync(sharedJsDir)) {
                const jsFiles = fs.readdirSync(sharedJsDir);
                jsFiles.forEach(file => {
                    const filePath = path.join(sharedJsDir, file);
                    if (fs.statSync(filePath).isFile()) {
                        archive.file(filePath, { name: `shared/js/${file}` });
                    }
                });
            }

            // Add shared CSS files to css/ directory
            const sharedCssDir = path.join(sharedDir, 'css');
            if (fs.existsSync(sharedCssDir)) {
                const cssFiles = fs.readdirSync(sharedCssDir);
                cssFiles.forEach(file => {
                    const filePath = path.join(sharedCssDir, file);
                    if (fs.statSync(filePath).isFile()) {
                        archive.file(filePath, { name: `shared/css/${file}` });
                    }
                });
            }
        }

        // Finalize the archive
        archive.finalize();
    });
}

/**
 * Build all apps
 */
async function buildAll() {
    console.log('FabMo CNC Cobot Workshop - Build Tool');
    console.log('=====================================\n');

    for (const appKey of Object.keys(APPS)) {
        try {
            await buildApp(appKey);
        } catch (error) {
            console.error(`  ✗ Failed to build ${appKey}:`, error.message);
            process.exit(1);
        }
    }

    console.log('\n✓ All apps built successfully!');
    console.log(`\nBuilt files are in: ${BUILD_DIR}/\n`);
}

/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'all') {
        await buildAll();
    } else {
        const appKey = args[0];
        if (!APPS[appKey]) {
            console.error(`Unknown app: ${appKey}`);
            console.error(`Available apps: ${Object.keys(APPS).join(', ')}`);
            process.exit(1);
        }
        
        console.log('FabMo CNC Cobot Workshop - Build Tool');
        console.log('=====================================');
        
        try {
            await buildApp(appKey);
            console.log(`\n✓ Build complete!\n`);
        } catch (error) {
            console.error(`\n✗ Build failed:`, error.message);
            process.exit(1);
        }
    }
}

// Run the build
main().catch(error => {
    console.error('Build error:', error);
    process.exit(1);
});