// HTML模板生成工具
const fs = require('fs');
const path = require('path');

/**
 * 生成新闻摘要HTML页面
 * @param {Array} newsItems - 新闻列表
 * @param {string} outputPath - 输出文件路径
 * @param {string} topic - 搜索主题
 */
function generateNewsHtml(newsItems, outputPath, topic) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>新闻摘要 - ${topic}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
        }
        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        .news-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
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
            color: #666;
        }
        .time {
            color: #999;
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
            color: #666;
            line-height: 1.6;
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
        }
        .btn-secondary {
            background: #764ba2;
            color: white;
        }
        .btn-secondary:hover {
            background: #6a4293;
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
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            display: none;
            z-index: 1000;
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
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📰 新闻摘要：${topic}</h1>
        <p>最近3-5天内的相关新闻 | 共 ${newsItems.length} 条</p>
    </div>

    <div class="container">
        ${newsItems.map((item, index) => `
        <div class="news-card">
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
        <p>🤖 由 Claude Code 生成 | ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="loading" id="loading">正在生成AI解读...</div>

    <script>
        const newsData = ${JSON.stringify(newsItems)};

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
                alert('无法连接到AI解读服务器。请确保服务器正在运行。\\n错误: ' + error.message);
                console.error('Error:', error);
            } finally {
                loading.classList.remove('active');
            }
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(outputPath, html, 'utf8');
    return outputPath;
}

function getAuthorityText(authority) {
    const authorityMap = {
        'high': '权威来源',
        'medium': '一般来源',
        'low': '待验证'
    };
    return authorityMap[authority.toLowerCase()] || '未知';
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateNewsHtml
    };
}
