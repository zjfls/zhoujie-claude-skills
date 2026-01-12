const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const VENDOR_DIR = path.join(PUBLIC_DIR, 'vendor');

// Ensure directories exist
if (!fs.existsSync(VENDOR_DIR)) {
    fs.mkdirSync(VENDOR_DIR, { recursive: true });
}

const assets = [
    // Highlight.js
    {
        url: 'https://cdn.staticfile.net/highlight.js/11.9.0/highlight.min.js',
        path: 'highlight.js/11.9.0/highlight.min.js'
    },
    {
        url: 'https://cdn.staticfile.net/highlight.js/11.9.0/styles/github-dark.min.css',
        path: 'highlight.js/11.9.0/styles/github-dark.min.css'
    },
    // KaTeX
    {
        url: 'https://cdn.staticfile.net/KaTeX/0.16.9/katex.min.css',
        path: 'KaTeX/0.16.9/katex.min.css'
    },
    {
        url: 'https://cdn.staticfile.net/KaTeX/0.16.9/katex.min.js',
        path: 'KaTeX/0.16.9/katex.min.js'
    },
    {
        url: 'https://cdn.staticfile.net/KaTeX/0.16.9/contrib/auto-render.min.js',
        path: 'KaTeX/0.16.9/contrib/auto-render.min.js'
    }
];

// KaTeX Fonts (Need to be downloaded to fonts folder relative to css)
const fontBaseUrl = 'https://cdn.staticfile.net/KaTeX/0.16.9/fonts';
const fonts = [
    'KaTeX_AMS-Regular.woff2',
    'KaTeX_Caligraphic-Bold.woff2',
    'KaTeX_Caligraphic-Regular.woff2',
    'KaTeX_Fraktur-Bold.woff2',
    'KaTeX_Fraktur-Regular.woff2',
    'KaTeX_Main-Bold.woff2',
    'KaTeX_Main-BoldItalic.woff2',
    'KaTeX_Main-Italic.woff2',
    'KaTeX_Main-Regular.woff2',
    'KaTeX_Math-BoldItalic.woff2',
    'KaTeX_Math-Italic.woff2',
    'KaTeX_SansSerif-Bold.woff2',
    'KaTeX_SansSerif-Italic.woff2',
    'KaTeX_SansSerif-Regular.woff2',
    'KaTeX_Script-Regular.woff2',
    'KaTeX_Size1-Regular.woff2',
    'KaTeX_Size2-Regular.woff2',
    'KaTeX_Size3-Regular.woff2',
    'KaTeX_Size4-Regular.woff2',
    'KaTeX_Typewriter-Regular.woff2'
];

fonts.forEach(font => {
    assets.push({
        url: `${fontBaseUrl}/${font}`,
        path: `KaTeX/0.16.9/fonts/${font}`
    });
});

console.log('Downloading assets...');

assets.forEach(asset => {
    const fullPath = path.join(VENDOR_DIR, asset.path);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    try {
        console.log(`Downloading ${asset.url}...`);
        execSync(`curl -L -s -o "${fullPath}" "${asset.url}"`);
        console.log(`Saved to ${asset.path}`);
    } catch (err) {
        console.error(`Failed to download ${asset.url}:`, err.message);
    }
});

console.log('All assets downloaded.');
