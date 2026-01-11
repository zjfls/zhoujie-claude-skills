const fs = require('fs');
const path = require('path');

// 读取新闻数据
const dataPath = path.join(__dirname, 'output', 'ai_news_data.json');
const newsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 生成HTML
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const outputPath = path.join(__dirname, 'output', `ai_news_summary_${timestamp}.html`);

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI行业深度技术信息摘要</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .header {
            max-width: 1200px;
            margin: 0 auto 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            font-size: 36px;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            font-size: 14px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        .news-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
        }
        .news-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }
        .news-title {
            font-size: 18px;
            font-weight: bold;
            color: #1a202c;
            margin-bottom: 12px;
            line-height: 1.4;
        }
        .news-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 12px;
            font-size: 13px;
        }
        .source {
            color: #4a5568;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .time {
            color: #718096;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .authority {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .authority.high {
            background: #10b981;
            color: white;
        }
        .authority.medium {
            background: #f59e0b;
            color: white;
        }
        .authority.low {
            background: #9ca3af;
            color: white;
        }
        .news-summary {
            flex: 1;
            color: #4a5568;
            line-height: 1.7;
            margin-bottom: 16px;
            font-size: 14px;
        }
        .news-actions {
            display: flex;
            gap: 10px;
            margin-top: auto;
        }
        .btn {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            text-align: center;
            display: inline-block;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
        .btn-secondary {
            background: #764ba2;
            color: white;
        }
        .btn-secondary:hover {
            background: #6a4293;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(118, 75, 162, 0.3);
        }
        .footer {
            max-width: 1200px;
            margin: 30px auto 0;
            text-align: center;
            color: white;
            font-size: 14px;
            opacity: 0.8;
        }
        .loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 24px 48px;
            border-radius: 12px;
            display: none;
            z-index: 1000;
            font-size: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .loading.active {
            display: block;
        }
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
            .header h1 {
                font-size: 28px;
            }
            .stats {
                flex-direction: column;
                gap: 10px;
            }
        }
        .badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin: 0 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI行业深度技术信息摘要</h1>
        <p>最近3-5天内的AI技术突破与行业动态</p>
        <div class="stats">
            <span class="badge">共 ${newsData.length} 条技术新闻</span>
            <span class="badge">全球信息为主</span>
            <span class="badge">技术深度解析</span>
        </div>
    </div>

    <div class="container">
        ${newsData.map((item, index) => `
        <div class="news-card" data-index="${index}">
            <div class="news-title">${item.title}</div>
            <div class="news-meta">
                <span class="source">📰 ${item.source}</span>
                <span class="time">⏰ ${item.time}</span>
                <span class="authority ${item.authority.toLowerCase()}">${getAuthorityText(item.authority)}</span>
            </div>
            <div class="news-summary">${item.summary}</div>
            <div class="news-actions">
                <a href="${item.url}" target="_blank" class="btn btn-primary">查看原文</a>
                <button class="btn btn-secondary" onclick="analyzeNews(${index})">AI解读</button>
            </div>
        </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>🤖 由 Claude Code 生成 | ${new Date().toLocaleString('zh-CN')} | AI解读服务器运行在 http://localhost:3456</p>
    </div>

    <div class="loading" id="loading">
        <div>正在生成AI解读...</div>
    </div>

    <script>
        const newsData = ${JSON.stringify(newsData, null, 2)};

        function getAuthorityText(authority) {
            const authorityMap = {
                'high': '权威来源',
                'medium': '一般来源',
                'low': '待验证'
            };
            return authorityMap[authority.toLowerCase()] || '未知';
        }

        async function analyzeNews(index) {
            const news = newsData[index];
            const loading = document.getElementById('loading');
            loading.classList.add('active');

            try {
                const response = await fetch('http://localhost:3456/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: news.title,
                        url: news.url,
                        content: news.summary,
                        source: news.source,
                        time: news.time
                    })
                });

                const result = await response.json();

                if (result.success) {
                    console.log('AI解读已生成:', result.filePath);
                    // 浏览器会自动打开新页面
                } else {
                    alert('生成AI解读失败: ' + result.error);
                }
            } catch (error) {
                alert('无法连接到AI解读服务器。请确保服务器正在运行。\\n\\n启动命令：\\ncd ~/.claude/skills/news-summary\\nnode server.js\\n\\n错误: ' + error.message);
                console.error('Error:', error);
            } finally {
                setTimeout(() => {
                    loading.classList.remove('active');
                }, 500);
            }
        }

        // 添加卡片动画
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.news-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });
    </script>
</body>
</html>`;

function getAuthorityText(authority) {
    const authorityMap = {
        'high': '权威来源',
        'medium': '一般来源',
        'low': '待验证'
    };
    return authorityMap[authority.toLowerCase()] || '未知';
}

fs.writeFileSync(outputPath, html, 'utf8');
console.log('HTML文件已生成:', outputPath);
console.log('正在打开浏览器...');

// 打开浏览器
const { exec } = require('child_process');
let command;
if (process.platform === 'win32') {
    // Windows: 使用 PowerShell 的 Start-Process 命令（更可靠）
    command = `powershell -Command "Start-Process '${outputPath}'"`;
} else if (process.platform === 'darwin') {
    command = `open "${outputPath}"`;
} else {
    command = `xdg-open "${outputPath}"`;
}
exec(command, (error) => {
    if (error) {
        console.error('打开浏览器失败:', error);
    } else {
        console.log('浏览器已打开');
    }
});
