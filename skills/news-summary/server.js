const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

const PORT = 3456;
const BASE_DIR = __dirname;
// 支持从环境变量或当前工作目录读取工作目录
const WORK_DIR = process.env.NEWS_WORK_DIR || process.cwd();

console.log(`Server BASE_DIR: ${BASE_DIR}`);
console.log(`Server WORK_DIR: ${WORK_DIR}`);
const ANALYSIS_TIMEOUT = 120000; // 120秒超时

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`${req.method} ${pathname}`);

    if (pathname === '/news-ai.js') {
        const scriptPath = path.join(BASE_DIR, 'news-ai.js');
        fs.readFile(scriptPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('news-ai.js not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    if (pathname === '/check-analysis' && req.method === 'GET') {
        const newsId = parsedUrl.query.newsId;
        const timestamp = parsedUrl.query.timestamp;

        if (!newsId || !timestamp) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing newsId or timestamp' }));
            return;
        }

        const analysisFile = path.join(WORK_DIR, 'news-summary', timestamp, 'analysis', `news_analysis_${newsId}.md`);

        fs.access(analysisFile, fs.constants.F_OK, (err) => {
            console.log('发送成功响应'); res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists: !err }));
        });
        return;
    }

    if (pathname === '/analyze' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            console.log('收到analyze请求');
            try {
                const data = JSON.parse(body);
                const { newsId, newsUrl, newsSource, newsTime, timestamp, title, summary, customPrompt } = data;

                const analysisDir = path.join(WORK_DIR, 'news-summary', timestamp, 'analysis');
                const analysisFile = path.join(analysisDir, `news_analysis_${newsId}.md`);

                // 构建AI提示词
                const newsTitle = title || '未知标题';
                const newsSummary = summary || '暂无摘要';

                let aiPrompt = `请对以下新闻进行深度分析解读：

## 新闻信息
- **标题**: ${newsTitle}
- **来源**: ${newsSource || '未知来源'}
- **时间**: ${newsTime || '未知时间'}
- **链接**: ${newsUrl || '#'}

## 新闻摘要
${newsSummary}

## 分析要求
请提供详细的新闻分析，包括以下方面：
1. **背景分析**：事件的历史背景和相关上下文
2. **关键要点**：提炼出最重要的3-5个要点
3. **影响评估**：分析对行业、技术、用户等方面的影响
4. **相关延伸**：相关话题和深入思考的方向`;

                if (customPrompt) {
                    aiPrompt += `\n\n## 用户自定义分析角度\n${customPrompt}`;
                }

                aiPrompt += `\n\n请用Markdown格式输出，结构清晰，内容深入。`;

                // 创建分析目录
                if (!fs.existsSync(analysisDir)) {
                    fs.mkdirSync(analysisDir, { recursive: true });
                }

                // 调用Claude CLI生成AI解读
                console.log('调用Claude CLI生成分析...');

                const claudeProcess = spawn('claude', [
                    '--print',                      // 非交互式模式
                    '--model', 'kimi-k2-thinking-turbo'  // 使用kimi模型
                ], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });

                let output = '';
                let errorOutput = '';
                let timeoutId;
                let isTimeout = false;

                // 设置超时
                timeoutId = setTimeout(() => {
                    isTimeout = true;
                    claudeProcess.kill();
                    console.log('Claude CLI调用超时');
                }, ANALYSIS_TIMEOUT);

                claudeProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                claudeProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.error('Claude CLI错误输出:', data.toString());
                });

                claudeProcess.on('close', (code) => {
                    clearTimeout(timeoutId);

                    if (isTimeout) {
                        res.writeHead(408, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'AI分析请求超时，请稍后重试' }));
                        return;
                    }

                    if (code !== 0) {
                        console.error('Claude CLI执行失败，退出码:', code);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `AI分析生成失败: ${errorOutput}` }));
                        return;
                    }

                    // 保存分析结果
                    const analysisContent = `# 新闻深度解读

## 新闻信息
- **标题**: ${newsTitle}
- **来源**: ${newsSource || '未知来源'}
- **时间**: ${newsTime || '未知时间'}
- **链接**: ${newsUrl || '#'}

---

${output.trim()}

---
*本解读由AI自动生成，仅供参考*
`;

                    fs.writeFile(analysisFile, analysisContent, 'utf8', (err) => {
                        if (err) {
                            console.error('写入分析文件失败:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '保存分析文件失败' }));
                            return;
                        }

                        console.log('分析生成成功');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: '分析生成成功' }));
                    });
                });

                // 发送提示词到Claude CLI
                claudeProcess.stdin.write(aiPrompt);
                claudeProcess.stdin.end();

            } catch (err) {
                console.error('处理请求失败:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname === '/delete-analysis' && req.method === 'DELETE') {
        const newsId = parsedUrl.query.newsId;
        const timestamp = parsedUrl.query.timestamp;

        if (!newsId || !timestamp) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing newsId or timestamp' }));
            return;
        }

        const analysisFile = path.join(WORK_DIR, 'news-summary', timestamp, 'analysis', `news_analysis_${newsId}.md`);

        fs.unlink(analysisFile, (err) => {
            if (err) {
                console.error('删除分析文件失败:', err);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '分析文件不存在或删除失败' }));
                return;
            }

            console.log('分析文件已删除:', analysisFile);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: '分析文件已删除' }));
        });
        return;
    }

    if (pathname === '/view-analysis' && req.method === 'GET') {
        const newsId = parsedUrl.query.newsId;
        const timestamp = parsedUrl.query.timestamp;

        if (!newsId || !timestamp) {
            res.writeHead(400);
            res.end('Missing newsId or timestamp');
            return;
        }

        const analysisFile = path.join(WORK_DIR, 'news-summary', timestamp, 'analysis', `news_analysis_${newsId}.md`);

        fs.readFile(analysisFile, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Analysis not found');
                return;
            }

            const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 新闻解读</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #1f2937; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        h3 { color: #4b5563; }
        a { color: #667eea; }
        pre { background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        ul, ol { padding-left: 30px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <pre style="white-space: pre-wrap;">${escapeHtml(data)}</pre>
    </div>
</body>
</html>`;

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        });
        return;
    }

    // 支持两种路径：
    // 1. /output/ - 从 skill 目录的 output 子目录（向后兼容）
    // 2. /news-summary/ - 从当前工作目录的 news-summary 子目录
    if (pathname.startsWith('/output/')) {
        const filePath = path.join(BASE_DIR, pathname);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }

            const ext = path.extname(filePath);
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }

    if (pathname.startsWith('/news-summary/')) {
        const filePath = path.join(WORK_DIR, pathname);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }

            const ext = path.extname(filePath);
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }
    res.writeHead(404);
    res.end('Not found');
});

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
