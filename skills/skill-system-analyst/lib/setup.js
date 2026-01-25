const fs = require('fs');
const path = require('path');
const { DOCS_DIR } = require('./manifest-manager');

// Source assets in the skill folder
const SKILL_ASSETS_DIR = path.resolve(__dirname, '../static-assets');

function installAssets() {
    console.log("Installing/Updating static assets...");
    try {
        if (fs.existsSync(SKILL_ASSETS_DIR)) {
            const entries = fs.readdirSync(SKILL_ASSETS_DIR, { withFileTypes: true });

            for (let entry of entries) {
                const srcPath = path.join(SKILL_ASSETS_DIR, entry.name);

                // 1. Files to put in docs root (server scripts)
                if (['server.js', 'start_preview.sh', 'start_preview.bat'].includes(entry.name)) {
                    const destPath = path.join(DOCS_DIR, entry.name);
                    fs.copyFileSync(srcPath, destPath);

                    if (entry.name.endsWith('.sh')) {
                        try { fs.chmodSync(destPath, '755'); } catch (e) { }
                    }
                }
                // 2. Everything else goes to docs/assets/
                else {
                    const assetDestDir = path.join(DOCS_DIR, 'assets');
                    if (!fs.existsSync(assetDestDir)) fs.mkdirSync(assetDestDir, { recursive: true });

                    const destPath = path.join(assetDestDir, entry.name);

                    if (entry.isDirectory()) {
                        copyFolder(srcPath, destPath);
                    } else {
                        fs.copyFileSync(srcPath, destPath);
                    }
                }
            }
            console.log("Assets installed successfully.");
        } else {
            console.warn("Skill assets dir not found:", SKILL_ASSETS_DIR);
        }

        // Also install the portal index if missing
        const portalTemplate = path.resolve(__dirname, '../templates/portal-index.html');
        const portalTarget = path.join(DOCS_DIR, 'index.html');
        if (!fs.existsSync(portalTarget) && fs.existsSync(portalTemplate)) {
            fs.copyFileSync(portalTemplate, portalTarget);
            console.log("Portal index created.");
        }

    } catch (e) {
        console.error("Asset installation failed:", e);
    }
}

// Simple recursive copy helper
function copyFolder(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyFolder(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}


// Run if called directly
if (require.main === module) {
    installAssets();
}

module.exports = { installAssets };
