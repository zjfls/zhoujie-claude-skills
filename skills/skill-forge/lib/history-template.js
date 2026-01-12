/**
 * 生成历史记录报告HTML
 */
function generateHistoryHTML(quizzes, stats, wrongQuestions) {
    const { totalQuizzes, totalSubmissions, averageScore, knowledgePointsStats } = stats;

    // 计算总用时
    const totalTime = quizzes.reduce((sum, q) => {
        // 从submissions获取时间
        return sum + (q.time_spent || 0);
    }, 0);
    const totalHours = Math.floor(totalTime / 3600);
    const totalMinutes = Math.floor((totalTime % 3600) / 60);

    // 知识点排序（按掌握率）
    const knowledgeList = Object.keys(knowledgePointsStats).map(kp => {
        const stat = knowledgePointsStats[kp];
        const mastery = stat.total > 0 ? (stat.correct / stat.total * 100) : 0;
        return {
            name: kp,
            ...stat,
            mastery
        };
    }).sort((a, b) => a.mastery - b.mastery);

    // 成绩趋势数据（最近10次）
    const recentQuizzes = quizzes
        .filter(q => q.submitted_at)
        .slice(0, 10)
        .reverse();

    // 按知识点分组错题（去重）
    const wrongByKnowledge = {};
    const seenQuestions = new Map(); // 用于去重，key是题目内容，value是题目对象

    wrongQuestions.forEach(q => {
        // 基于题目内容去重
        const questionKey = q.content.trim();

        if (!seenQuestions.has(questionKey)) {
            seenQuestions.set(questionKey, q);

            // knowledge_points 已经在 database.js 中解析过了，直接使用
            const kps = q.knowledge_points || [];
            kps.forEach(kp => {
                if (!wrongByKnowledge[kp]) {
                    wrongByKnowledge[kp] = [];
                }
                wrongByKnowledge[kp].push(q);
            });
        }
    });

    // 获取去重后的错题总数
    const uniqueWrongQuestions = Array.from(seenQuestions.values());

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>学习历史记录 - Skill Forge</title>
    <!-- 代码高亮 (Local) -->
    <link rel="stylesheet" href="/vendor/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="/vendor/highlight.js/11.9.0/highlight.min.js"></script>
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        /* 顶部标题 */
        .header {
            background: white;
            border-radius: 16px;
            padding: 30px 40px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            text-align: center;
        }

        .header h1 {
            font-size: 32px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }

        .header p {
            color: #666;
            font-size: 16px;
        }

        /* 统计卡片 */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-icon {
            font-size: 36px;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #333;
            margin-bottom: 8px;
        }

        .stat-label {
            font-size: 14px;
            color: #666;
        }

        /* 成绩趋势图 */
        .trend-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .trend-card h2 {
            font-size: 22px;
            color: #333;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .chart-container {
            height: 300px;
            display: flex;
            align-items: flex-end;
            gap: 15px;
            padding: 20px;
            border-left: 2px solid #e0e0e0;
            border-bottom: 2px solid #e0e0e0;
            position: relative;
        }

        .chart-bar {
            flex: 1;
            background: linear-gradient(180deg, #667eea, #764ba2);
            border-radius: 6px 6px 0 0;
            position: relative;
            cursor: pointer;
            transition: all 0.3s;
        }

        .chart-bar:hover {
            opacity: 0.8;
            transform: translateY(-5px);
        }

        .chart-bar-label {
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: #666;
            white-space: nowrap;
        }

        .chart-bar-value {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            font-weight: 600;
            color: #667eea;
        }

        /* 知识点掌握 */
        .knowledge-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .knowledge-card h2 {
            font-size: 22px;
            color: #333;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .knowledge-grid {
            display: grid;
            gap: 20px;
        }

        .knowledge-item {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .knowledge-name {
            flex: 0 0 150px;
            font-size: 15px;
            font-weight: 600;
            color: #333;
        }

        .knowledge-bar-container {
            flex: 1;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }

        .knowledge-bar-fill {
            height: 100%;
            border-radius: 15px;
            transition: width 1s ease;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
        }

        .knowledge-percentage {
            color: white;
            font-size: 13px;
            font-weight: 600;
        }

        .knowledge-stats {
            flex: 0 0 100px;
            text-align: right;
            font-size: 13px;
            color: #666;
        }

        /* 测验历史时间轴 */
        .timeline-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .timeline-card h2 {
            font-size: 22px;
            color: #333;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .timeline {
            position: relative;
            padding-left: 40px;
        }

        .timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #e0e0e0;
        }

        .timeline-item {
            position: relative;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }

        .timeline-item::before {
            content: '';
            position: absolute;
            left: -44px;
            top: 25px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            border: 4px solid #667eea;
        }

        .timeline-item.completed::before {
            border-color: #28a745;
        }

        .timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .timeline-topic {
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }

        .timeline-score {
            font-size: 16px;
            font-weight: 600;
        }

        .timeline-score.pass {
            color: #28a745;
        }

        .timeline-score.fail {
            color: #dc3545;
        }

        .timeline-meta {
            display: flex;
            gap: 20px;
            font-size: 14px;
            color: #666;
        }

        .timeline-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
        }

        .btn-small {
            padding: 6px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-view {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .btn-view:hover {
            opacity: 0.9;
        }

        /* 错题本 */
        .wrong-book-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .wrong-book-card h2 {
            font-size: 22px;
            color: #dc3545;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .wrong-by-knowledge {
            margin-bottom: 30px;
        }

        .knowledge-section {
            margin-bottom: 25px;
        }

        .knowledge-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .knowledge-header:hover {
            opacity: 0.9;
        }

        .wrong-question {
            background: #fff8f8;
            border-left: 4px solid #dc3545;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
        }

        .wrong-question-title {
            font-size: 15px;
            color: #333;
            margin-bottom: 10px;
            line-height: 1.6;
        }

        .wrong-question-meta {
            font-size: 13px;
            color: #999;
        }

        /* 操作按钮 */
        .action-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 15px 35px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
        }

        .btn-secondary:hover {
            background: #f0f4ff;
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
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .chart-container {
                height: 200px;
            }

            .knowledge-item {
                flex-direction: column;
                align-items: flex-start;
            }

            .knowledge-name {
                flex: 1;
            }

            .knowledge-bar-container {
                width: 100%;
            }

            .timeline {
                padding-left: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- 顶部标题 -->
        <div class="header">
            <a href="/dashboard" class="back-link" style="display: inline-block; color: #667eea; text-decoration: none; margin-bottom: 15px; font-weight: 600; transition: all 0.3s;">← 返回 Dashboard</a>
            <h1>📚 学习历史记录</h1>
            <p>追踪你的学习进度，发现提升空间</p>
        </div>

        ${totalSubmissions > 0 ? `
        <!-- 统计卡片 -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-value">${totalSubmissions}</div>
                <div class="stat-label">完成测验</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value">${averageScore.toFixed(1)}%</div>
                <div class="stat-label">平均分数</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-value">${totalHours}h ${totalMinutes}m</div>
                <div class="stat-label">累计学习</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📕</div>
                <div class="stat-value">${uniqueWrongQuestions.length}</div>
                <div class="stat-label">错题收集（已去重）</div>
            </div>
        </div>

        <!-- 成绩趋势图 -->
        ${recentQuizzes.length > 0 ? `
        <div class="trend-card">
            <h2>📈 成绩趋势（最近10次）</h2>
            <div class="chart-container">
                ${recentQuizzes.map(q => {
        const score = q.total_score > 0 ? (q.obtained_score / q.total_score * 100) : 0;
        const height = Math.max(20, score * 2.5);
        const date = new Date(q.submitted_at);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        return `
                    <div class="chart-bar" style="height: ${height}px;" title="${q.topic} - ${score.toFixed(1)}%">
                        <div class="chart-bar-value">${score.toFixed(0)}%</div>
                        <div class="chart-bar-label">${dateStr}</div>
                    </div>
                    `;
    }).join('')}
            </div>
        </div>
        ` : ''}

        <!-- 知识点掌握情况 -->
        ${knowledgeList.length > 0 ? `
        <div class="knowledge-card">
            <h2>🎯 知识点掌握情况</h2>
            <div class="knowledge-grid">
                ${knowledgeList.map(kp => {
        const color = kp.mastery >= 80 ? '#28a745' : kp.mastery >= 60 ? '#ffc107' : '#dc3545';
        return `
                    <div class="knowledge-item">
                        <div class="knowledge-name">${kp.name}</div>
                        <div class="knowledge-bar-container">
                            <div class="knowledge-bar-fill" style="width: ${kp.mastery}%; background: ${color};">
                                <span class="knowledge-percentage">${kp.mastery.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div class="knowledge-stats">${kp.correct}/${kp.total} 正确</div>
                    </div>
                    `;
    }).join('')}
            </div>
        </div>
        ` : ''}

        <!-- 测验历史时间轴 -->
        <div class="timeline-card">
            <h2>⏰ 测验历史</h2>
            <div class="timeline">
                ${quizzes.map(q => {
        const hasSubmission = q.submitted_at;
        const score = hasSubmission && q.total_score > 0 ? (q.obtained_score / q.total_score * 100) : 0;
        const isPassed = q.pass_status === 'pass';
        const date = hasSubmission ? new Date(q.submitted_at) : new Date(q.created_at);
        const dateStr = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
                    <div class="timeline-item ${hasSubmission ? 'completed' : ''}">
                        <div class="timeline-header">
                            <div class="timeline-topic">${q.topic}</div>
                            ${hasSubmission ? `
                                <div class="timeline-score ${isPassed ? 'pass' : 'fail'}">
                                    ${score.toFixed(1)}% ${isPassed ? '✓' : '✗'}
                                </div>
                            ` : ''}
                        </div>
                        <div class="timeline-meta">
                            <span>📅 ${dateStr}</span>
                            <span>📝 ${q.question_count} 题</span>
                            <span>🏷️ ${q.difficulty === 'beginner' ? '初级' : q.difficulty === 'intermediate' ? '中级' : '高级'}</span>
                            ${hasSubmission ? `<span>⏱️ ${Math.floor(q.time_spent / 60)}分${q.time_spent % 60}秒</span>` : ''}
                        </div>
                        <div class="timeline-actions">
                            ${hasSubmission ? `
                                <button class="btn-small btn-view" onclick="viewResult('${q.quiz_id}')">查看成绩</button>
                            ` : `
                                <button class="btn-small btn-view" onclick="continueQuiz('${q.quiz_id}')">继续答题</button>
                            `}
                        </div>
                    </div>
                    `;
    }).join('')}
            </div>
        </div>

        <!-- 错题本 -->
        ${uniqueWrongQuestions.length > 0 ? `
        <div class="wrong-book-card">
            <h2>📕 完整错题本（${uniqueWrongQuestions.length} 题，已去重）</h2>
            <div class="wrong-by-knowledge">
                ${Object.keys(wrongByKnowledge).map(kp => {
        const questions = wrongByKnowledge[kp];
        return `
                    <div class="knowledge-section">
                        <div class="knowledge-header">
                            <span>${kp}</span>
                            <span>${questions.length} 题</span>
                        </div>
                        ${questions.map((q, idx) => `
                            <div class="wrong-question">
                                <div class="wrong-question-title">
                                    ${idx + 1}. ${escapeHtml(q.content)}
                                </div>
                                <div class="wrong-question-meta">
                                    来源：${q.quiz_id} | ${new Date(q.submitted_at).toLocaleDateString()}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    `;
    }).join('')}
            </div>
        </div>
        ` : ''}

        ` : `
        <!-- 空状态 -->
        <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <div class="empty-state-text">还没有测验记录，开始你的第一次测验吧！</div>
        </div>
        `}

        <!-- 操作按钮 -->
        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="window.history.back()">← 返回</button>
            <button class="btn btn-primary" onclick="createNewQuiz()">📝 创建新测验</button>
        </div>
    </div>

    <script>
        function viewResult(quizId) {
            // 查找该测验的submission_id
            window.location.href = '/result/' + quizId;
        }

        function continueQuiz(quizId) {
            window.location.href = '/quiz/' + quizId;
        }

        function createNewQuiz() {
            alert('请在Claude Code中使用 /skill-forge 命令创建新测验');
        }

        // 代码高亮
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        });
    </script>
</body>
</html>`;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

module.exports = {
    generateHistoryHTML
};
