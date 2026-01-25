/**
 * doc-engine.js
 * 
 * Powered by:
 * - Markmap (for System Map)
 * - Mermaid (for Diagrams)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Show Loading State
    const mapContainer = document.querySelector('.system-map-container');
    if (mapContainer) {
        mapContainer.style.background = '#fafafa';
    }

    // 2. Wait for Libs
    let attempts = 0;
    const checkLibs = setInterval(() => {
        attempts++;
        const hasMarkmap = window.markmap && window.d3;
        const hasMermaid = window.mermaid;

        if (hasMarkmap && hasMermaid) {
            clearInterval(checkLibs);
            console.log("Libs loaded. Initializing visualizations...");
            initSystemMap();
            initMermaid();
        } else if (attempts > 50) { // 5 seconds
            clearInterval(checkLibs);
            console.error("Libs failed to load.", {
                markmap: !!window.markmap,
                d3: !!window.d3,
                mermaid: !!window.mermaid
            });
            if (!hasMarkmap) displayError('#system-map', 'Markmap libraries failed to load (Network/CDN error).');
            if (!hasMermaid) document.querySelectorAll('.mermaid').forEach(el => displayError(el, 'Mermaid library failed to load.'));
        }
    }, 100);
});

function displayError(selectorOrEl, msg) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (el) {
        const err = document.createElement('div');
        err.style.color = 'red';
        err.style.padding = '10px';
        err.style.border = '1px solid red';
        err.style.background = '#fee';
        err.innerText = '可视化渲染失败: ' + msg;
        el.replaceWith(err);
    }
}

function initSystemMap() {
    const svg = document.querySelector('#system-map');
    const dataContainer = document.querySelector('#system-map-data');

    if (!svg || !dataContainer) return;

    const markdown = dataContainer.textContent.trim();
    if (!markdown) {
        displayError(svg, 'No Mindmap data found.');
        return;
    }

    try {
        const { Transformer, Markmap, loadCSS, loadJS } = window.markmap;

        // Defensive check
        if (!Transformer || !Markmap) {
            throw new Error(`Markmap API incomplete. Transformer: ${!!Transformer}, Markmap: ${!!Markmap}`);
        }

        const transformer = new Transformer();
        const { root, features } = transformer.transform(markdown);

        if (features) {
            const { styles, scripts } = transformer.getUsedAssets(features);
            if (styles) loadCSS(styles);
            if (scripts) loadJS(scripts, { getMarkmap: () => window.markmap });
        }

        Markmap.create(svg, null, root);
        console.log("Markmap rendered.");

    } catch (e) {
        console.error("Markmap render error:", e);
        displayError(svg, e.message);
    }
}

function initMermaid() {
    try {
        window.mermaid.initialize({
            startOnLoad: true,
            theme: 'default', // 'dark' sometimes causes contrast issues if css is not perfect
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif'
        });
        window.mermaid.run(); // Explicitly run for v10+
        console.log("Mermaid initialized.");
    } catch (e) {
        console.error("Mermaid error:", e);
    }
}
