/**
 * sidebar-loader.js
 * Dynamically loads navigation from manifest.json to ensure consistency across all pages.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const navContainer = document.getElementById('nav-content');
    if (!navContainer) return;

    try {
        // Resolve manifest path. 
        // If we are in /docs/index.html, manifest is ./manifest.json
        // If we are in /docs/category/doc.html, manifest is ../../manifest.json
        // Let's try root-relative fetch if served by web server
        const manifestUrl = '/manifest.json';

        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error('Failed to load manifest');

        const manifest = await response.json();
        renderSidebar(manifest, navContainer);

    } catch (e) {
        console.error("Sidebar load error:", e);
        // Fallback: try relative path for local file opening (though CORS usually blocks this)
        // navContainer.innerHTML = `<div style="padding:1rem; color:#64748b">Navigation unavailable</div>`;
    }
});

function renderSidebar(manifest, container) {
    // 1. Determine current page ID from meta tag or URL
    // We expect doc pages to have <meta name="doc-id" content="...">
    const currentDocIdMeta = document.querySelector('meta[name="doc-id"]');
    const currentDocId = currentDocIdMeta ? currentDocIdMeta.content : null;
    const isDashboard = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';

    let html = '';

    // Dashboard Link
    html += `
        <a href="/index.html" class="nav-item ${isDashboard ? 'active' : ''}">
            Dashboard
        </a>
    `;

    // 2. Group Docs
    const grouped = {};
    (manifest.categories || []).forEach(c => grouped[c] = []);
    manifest.documents.forEach(doc => {
        if (!grouped[doc.category]) grouped[doc.category] = [];
        grouped[doc.category].push(doc);
    });

    // 3. Render Groups
    for (const [category, docs] of Object.entries(grouped)) {
        if (docs.length === 0) continue;

        html += `<div class="nav-category">${category}</div>`;

        docs.forEach(doc => {
            const isActive = doc.id === currentDocId;
            // Links are absolute from root to avoid relative path hell
            html += `
                <a href="/${doc.filepath}" class="nav-item ${isActive ? 'active' : ''}">
                    ${doc.title}
                </a>
            `;
        });
    }

    container.innerHTML = html;
}
