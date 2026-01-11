/**
 * 生成Dashboard首页HTML
 */
function generateDashboardHTML(quizzes) {
    // 统计数据
    const totalQuizzes = quizzes.length;
    const completedQuizzes = quizzes.filter(q => q.submitted_at).length;
    const averageScore = quizzes
        .filter(q => q.total_score)
        .reduce((sum, q) => sum + (q.obtained_score / q.total_score * 100), 0) / (completedQuizzes || 1);

    // 按状态分类
    const completed = quizzes.filter(q => q.submitted_at);
    const inProgress = quizzes.filter(q => !q.submitted_at);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skill Forge - 测验中心</title>
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
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 48px;
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        .header p {
            font-size: 18px;
            opacity: 0.9;
        }

        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }

        .stat-value {
            font-size: 36px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .section {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        .section h2 {
            font-size: 28px;
            margin-bottom: 25px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .quiz-list {
            display: grid;
            gap: 20px;
        }

        .quiz-card {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 25px;
            transition: all 0.3s;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fafafa;
        }

        .quiz-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
            background: white;
        }

        .quiz-info {
            flex: 1;
        }

        .quiz-title {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }

        .quiz-meta {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
            color: #666;
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
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }

        .status-completed {
            background: #28a745;
            color: white;
        }

        .status-in-progress {
            background: #ffc107;
            color: #333;
        }

        .quiz-score {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
        }

        .quiz-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .btn-success {
            background: #28a745;
            color: white;
        }

        .btn-success:hover {
            background: #218838;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }

        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }

        .empty-state-text {
            font-size: 18px;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 32px;
            }

            .section {
                padding: 25px;
            }

            .quiz-card {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }

            .quiz-actions {
                width: 100%;
                justify-content: stretch;
            }

            .btn {
                flex: 1;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Skill Forge</h1>
            <p>智能学习测验系统</p>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-container">
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-value">${totalQuizzes}</div>
                <div class="stat-label">总测验数</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${completedQuizzes}</div>
                <div class="stat-label">已完成</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value">${averageScore.toFixed(1)}%</div>
                <div class="stat-label">平均分数</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-value">${inProgress.length}</div>
                <div class="stat-label">进行中</div>
            </div>
        </div>

        ${completed.length > 0 ? `
        <!-- 已完成的测验 -->
        <div class="section">
            <h2>✅ 已完成的测验</h2>
            <div class="quiz-list">
                ${completed.map(quiz => `
                    <div class="quiz-card">
                        <div class="quiz-info">
                            <div class="quiz-title">${quiz.topic}</div>
                            <div class="quiz-meta">
                                <span class="meta-item">
                                    <span>📅</span>
                                    <span>${new Date(quiz.submitted_at).toLocaleString('zh-CN', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                </span>
                                <span class="difficulty-badge difficulty-${quiz.difficulty}">
                                    ${getDifficultyLabel(quiz.difficulty)}
                                </span>
                                <span class="meta-item">
                                    <span>📋</span>
                                    <span>${quiz.question_count} 题</span>
                                </span>
                                <span class="status-badge status-completed">已完成</span>
                            </div>
                            <div class="quiz-score">
                                ${quiz.obtained_score}/${quiz.total_score} 分
                                (${(quiz.obtained_score / quiz.total_score * 100).toFixed(1)}%)
                            </div>
                        </div>
                        <div class="quiz-actions">
                            <button class="btn btn-secondary" onclick="viewResult('${quiz.quiz_id}')">
                                查看成绩
                            </button>
                            <button class="btn btn-primary" onclick="retakeQuiz('${quiz.quiz_id}')">
                                🔄 重做
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${inProgress.length > 0 ? `
        <!-- 进行中的测验 -->
        <div class="section">
            <h2>⏳ 进行中的测验</h2>
            <div class="quiz-list">
                ${inProgress.map(quiz => `
                    <div class="quiz-card">
                        <div class="quiz-info">
                            <div class="quiz-title">${quiz.topic}</div>
                            <div class="quiz-meta">
                                <span class="meta-item">
                                    <span>📅</span>
                                    <span>${new Date(quiz.created_at).toLocaleString('zh-CN', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                </span>
                                <span class="difficulty-badge difficulty-${quiz.difficulty}">
                                    ${getDifficultyLabel(quiz.difficulty)}
                                </span>
                                <span class="meta-item">
                                    <span>📋</span>
                                    <span>${quiz.question_count} 题</span>
                                </span>
                                <span class="status-badge status-in-progress">进行中</span>
                            </div>
                        </div>
                        <div class="quiz-actions">
                            <button class="btn btn-success" onclick="continueQuiz('${quiz.quiz_id}')">
                                继续答题 →
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${totalQuizzes === 0 ? `
        <div class="section">
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <div class="empty-state-text">还没有任何测验</div>
                <p style="color: #999; margin-top: 10px;">请使用 /skill-forge 命令创建新测验</p>
            </div>
        </div>
        ` : ''}
    </div>

    <script>
        function viewResult(quizId) {
            window.location.href = '/quizzes/' + quizId + '/result.html';
        }

        function continueQuiz(quizId) {
            window.location.href = '/quizzes/' + quizId + '/quiz.html';
        }

        function retakeQuiz(quizId) {
            if (confirm('确定要重做这个测验吗？\\n\\n系统会清除草稿答案，并生成新的提交记录。')) {
                // 清除localStorage中的草稿
                localStorage.removeItem('quiz_' + quizId + '_draft');

                // 跳转到测验页面
                window.location.href = '/quizzes/' + quizId + '/quiz.html';
            }
        }

        function getDifficultyLabel(difficulty) {
            const labels = {
                'beginner': '初级',
                'intermediate': '中级',
                'advanced': '高级'
            };
            return labels[difficulty] || difficulty;
        }
    </script>
</body>
</html>`;
}

function getDifficultyLabel(difficulty) {
    const labels = {
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级'
    };
    return labels[difficulty] || difficulty;
}

module.exports = {
    generateDashboardHTML
};
