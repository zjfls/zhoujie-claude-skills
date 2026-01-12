/**
 * 生成题目搜索页面HTML
 */
function generateQuestionSearchHTML(query = '', results = []) {
    // 高亮函数
    function highlightText(text, searchQuery) {
        if (!searchQuery) return text;
        try {
            const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('(' + escapedQuery + ')', 'gi');
            return text.replace(regex, '<mark style="background: #fff59d; padding: 2px 4px; border-radius: 3px;">$1</mark>');
        } catch (e) {
            return text;
        }
    }

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>题目搜索 - Skill Forge</title>
    <!-- KaTeX 数学公式渲染 (Local) -->
    <link rel="stylesheet" href="/vendor/KaTeX/0.16.9/katex.min.css">
    <script src="/vendor/KaTeX/0.16.9/katex.min.js"></script>
    <script src="/vendor/KaTeX/0.16.9/contrib/auto-render.min.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError : false
            });
        });
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        .header {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .header h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 32px;
        }

        .back-link {
            display: inline-block;
            color: #667eea;
            text-decoration: none;
            margin-bottom: 15px;
            font-weight: 600;
            transition: all 0.3s;
        }

        .back-link:hover {
            color: #764ba2;
            transform: translateX(-3px);
        }

        .search-section {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .search-form {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .search-input {
            flex: 1;
            padding: 15px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s;
        }

        .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-btn {
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .search-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }

        .search-tips {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
        }

        .results-section {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
        }

        .results-header h2 {
            color: #333;
            font-size: 24px;
        }

        .results-count {
            color: #667eea;
            font-weight: 600;
        }

        .question-card {
            background: #f9f9f9;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
            transition: all 0.3s;
        }

        .question-card:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }

        .question-number {
            color: #667eea;
            font-weight: 700;
            font-size: 16px;
        }

        .question-meta {
            display: flex;
            gap: 10px;
            align-items: center;
            font-size: 13px;
            color: #666;
        }

        .quiz-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }

        .quiz-link:hover {
            text-decoration: underline;
        }

        .question-content {
            color: #333;
            line-height: 1.6;
            margin-bottom: 12px;
            font-size: 15px;
        }

        .question-options {
            background: white;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .option-item {
            padding: 8px 12px;
            margin: 5px 0;
            background: #f5f5f5;
            border-radius: 6px;
            font-size: 14px;
        }

        .knowledge-points {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .knowledge-tag {
            background: #e8eaf6;
            color: #667eea;
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }

        .empty-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }

        .empty-text {
            font-size: 18px;
            margin-bottom: 10px;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #667eea;
            font-size: 18px;
        }

        @media (max-width: 768px) {
            .search-form {
                flex-direction: column;
            }

            .header h1 {
                font-size: 24px;
            }

            .question-header {
                flex-direction: column;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/dashboard" class="back-link">← 返回 Dashboard</a>
            <h1>🔍 题目搜索</h1>
        </div>

        <div class="search-section">
            <form class="search-form" onsubmit="performSearch(event)">
                <input
                    type="text"
                    class="search-input"
                    id="searchInput"
                    placeholder="搜索题目内容、知识点..."
                    value="${query}"
                    autofocus
                />
                <button type="submit" class="search-btn">搜索</button>
            </form>
            <div class="search-tips">
                💡 提示：可以搜索题目内容、知识点关键词等
            </div>
        </div>

        <div class="results-section">
            <div class="results-header">
                <h2>搜索结果</h2>
                <span class="results-count" id="resultsCount">
                    ${results.length > 0 ? `找到 ${results.length} 道题目` : ''}
                </span>
            </div>

            <div id="resultsContainer">
                ${results.length > 0 ? results.map((result, idx) => `
                    <div class="question-card">
                        <div class="question-header">
                            <span class="question-number">题目 ${idx + 1}</span>
                            <div class="question-meta">
                                <span>📚 来自:</span>
                                <a href="/quiz/${result.quiz_id}" class="quiz-link">
                                    ${result.quiz_topic}
                                </a>
                            </div>
                        </div>

                        <div class="question-content">
                            ${highlightText(result.content, query)}
                        </div>

                        ${result.options && result.options.length > 0 ? `
                            <div class="question-options">
                                ${result.options.map((opt, i) => `
                                    <div class="option-item">
                                        ${String.fromCharCode(65 + i)}. ${opt}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${result.knowledge_points && result.knowledge_points.length > 0 ? `
                            <div class="knowledge-points">
                                ${result.knowledge_points.map(kp => `
                                    <span class="knowledge-tag">${kp}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('') : query ? `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <div class="empty-text">未找到相关题目</div>
                        <p style="color: #999; margin-top: 10px;">尝试使用其他关键词搜索</p>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <div class="empty-text">请输入搜索关键词</div>
                        <p style="color: #999; margin-top: 10px;">可以搜索题目内容、知识点等</p>
                    </div>
                `}
            </div>
        </div>
    </div>

    <script>
        function performSearch(event) {
            if (event) event.preventDefault();

            const searchInput = document.getElementById('searchInput');
            const query = searchInput.value.trim();

            if (!query) {
                alert('请输入搜索内容');
                return;
            }

            // 导航到搜索结果页面
            window.location.href = '/search-questions?q=' + encodeURIComponent(query);
        }
    </script>
</body>
</html>`;
}

module.exports = {
    generateQuestionSearchHTML
};
