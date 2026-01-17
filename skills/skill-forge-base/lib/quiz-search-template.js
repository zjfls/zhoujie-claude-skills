/**
 * 生成试卷搜索页面HTML
 */
function generateQuizSearchHTML(query = '', results = []) {
    function getDifficultyLabel(difficulty) {
        const labels = {
            'beginner': '初级',
            'intermediate': '中级',
            'advanced': '高级'
        };
        return labels[difficulty] || difficulty;
    }

    function getDifficultyClass(difficulty) {
        const classes = {
            'beginner': 'difficulty-beginner',
            'intermediate': 'difficulty-intermediate',
            'advanced': 'difficulty-advanced'
        };
        return classes[difficulty] || '';
    }

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>试卷搜索 - Skill Forge</title>
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
                    {left: '\\\\(', right: '\\\\)', display: false},
                    {left: '\\\\[', right: '\\\\]', display: true}
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

        .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin-top: 15px;
            border-radius: 0 8px 8px 0;
            font-size: 14px;
            color: #666;
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

        .quiz-card {
            background: #f9f9f9;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
            transition: all 0.3s;
        }

        .quiz-card:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .quiz-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }

        .quiz-title {
            font-size: 18px;
            font-weight: 700;
            color: #333;
        }

        .quiz-meta {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 12px;
            font-size: 14px;
            color: #666;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .difficulty-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        .difficulty-beginner {
            background: #d4edda;
            color: #155724;
        }

        .difficulty-intermediate {
            background: #fff3cd;
            color: #856404;
        }

        .difficulty-advanced {
            background: #f8d7da;
            color: #721c24;
        }

        .status-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        .status-created {
            background: #e0e0e0;
            color: #666;
        }

        .status-completed {
            background: #28a745;
            color: white;
        }

        .quiz-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
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

        @media (max-width: 768px) {
            .search-form {
                flex-direction: column;
            }

            .header h1 {
                font-size: 24px;
            }

            .quiz-header {
                flex-direction: column;
                gap: 10px;
            }

            .quiz-actions {
                flex-wrap: wrap;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/dashboard" class="back-link">← 返回 Dashboard</a>
            <h1>📄 试卷搜索</h1>
            <div class="info-box">
                💡 <strong>试卷 vs 考试记录</strong>：试卷是题目模板，可以被多次答题。每次答题提交会生成一条考试记录。
            </div>
        </div>

        <div class="search-section">
            <form class="search-form" onsubmit="performSearch(event)">
                <input
                    type="text"
                    class="search-input"
                    id="searchInput"
                    placeholder="搜索试卷主题..."
                    value="${query}"
                    autofocus
                />
                <button type="submit" class="search-btn">搜索</button>
            </form>
        </div>

        <div class="results-section">
            <div class="results-header">
                <h2>试卷列表</h2>
                <span class="results-count" id="resultsCount">
                    ${results.length > 0 ? `找到 ${results.length} 份试卷` : ''}
                </span>
            </div>

            <div id="resultsContainer">
                ${results.length > 0 ? results.map((quiz, idx) => `
                    <div class="quiz-card">
                        <div class="quiz-header">
                            <span class="quiz-title">${quiz.topic}</span>
                            <span class="difficulty-badge ${getDifficultyClass(quiz.difficulty)}">
                                ${getDifficultyLabel(quiz.difficulty)}
                            </span>
                        </div>

                        ${quiz.topic_detail ? `
                            <p style="color: #666; font-size: 14px; margin-bottom: 12px;">${quiz.topic_detail}</p>
                        ` : ''}

                        <div class="quiz-meta">
                            <span class="meta-item">📝 ${quiz.question_count} 道题</span>
                            <span class="meta-item">📅 ${new Date(quiz.created_at).toLocaleDateString('zh-CN')}</span>
                            <span class="meta-item">🎯 答题 ${quiz.submission_count} 次</span>
                            <span class="status-badge ${quiz.status === 'completed' ? 'status-completed' : 'status-created'}">
                                ${quiz.status === 'completed' ? '已完成' : '未答题'}
                            </span>
                        </div>

                        <div class="quiz-actions">
                            <button class="btn btn-primary" onclick="startQuiz('${quiz.quiz_id}')">
                                ${quiz.status === 'completed' ? '🔄 重新答题' : '✏️ 开始答题'}
                            </button>
                            <button class="btn btn-secondary" onclick="viewQuestions('${quiz.quiz_id}')">
                                📋 查看题目
                            </button>
                            <button class="btn" onclick="deleteQuiz('${quiz.quiz_id}')" style="background: #dc3545; color: white;">
                                🗑️ 删除试卷
                            </button>
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <div class="empty-icon">📄</div>
                        <div class="empty-text">${query ? '未找到相关试卷' : '暂无试卷'}</div>
                        <p style="color: #999; margin-top: 10px;">
                            ${query ? '尝试使用其他关键词搜索' : '请在 Claude Code 中使用 /skill-forge 命令创建新试卷'}
                        </p>
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

            // 导航到搜索结果页面
            window.location.href = '/search-quizzes' + (query ? '?q=' + encodeURIComponent(query) : '');
        }

        function startQuiz(quizId) {
            window.location.href = '/quiz/' + quizId;
        }

        function viewQuestions(quizId) {
            window.open('/quiz/' + quizId, '_blank');
        }

        async function deleteQuiz(quizId) {
            if (!confirm('确定要删除这个试卷吗？\\n\\n⚠️ 警告：这将删除试卷、所有题目、所有考试记录和 AI 问答历史！\\n此操作不可撤销！')) {
                return;
            }

            try {
                const response = await fetch('/api/delete-quiz', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ quiz_id: quizId })
                });
                const data = await response.json();

                if (data.success) {
                    alert('试卷已删除');
                    // 刷新页面
                    window.location.reload();
                } else {
                    alert('删除失败：' + (data.error || '未知错误'));
                }
            } catch (err) {
                console.error('删除试卷失败:', err);
                alert('删除试卷失败：' + err.message);
            }
        }
    </script>
</body>
</html>`;
}

module.exports = {
    generateQuizSearchHTML
};
