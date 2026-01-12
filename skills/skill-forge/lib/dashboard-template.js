/**
 * 生成Dashboard首页HTML
 */
function generateDashboardHTML(exams) {
    // 统计数据
    const totalExams = exams.length;
    const completedExams = exams.filter(e => e.status === 'completed').length;
    const averageScore = exams
        .filter(e => e.total_score)
        .reduce((sum, e) => sum + (e.obtained_score / e.total_score * 100), 0) / (completedExams || 1);

    // 按状态分类
    const completed = exams.filter(e => e.status === 'completed');
    const inProgress = exams.filter(e => e.status === 'in_progress');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skill Forge - 测验中心</title>
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

        .filter-section {
            margin-bottom: 30px;
        }

        .filter-container {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: flex-end;
        }

        .filter-item {
            flex: 1;
            min-width: 200px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .filter-item label {
            font-size: 14px;
            font-weight: 600;
            color: #666;
        }

        .filter-item input,
        .filter-item select {
            padding: 10px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
        }

        .filter-item input:focus,
        .filter-item select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div>
                    <h1>🎓 Skill Forge</h1>
                    <p>智能学习测验系统</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-primary" onclick="navigateToQuizSearchPage()" style="padding: 12px 24px;">
                        📄 搜索试卷
                    </button>
                    <button class="btn btn-primary" onclick="navigateToQuestionSearchPage()" style="padding: 12px 24px;">
                        🔍 搜索题目
                    </button>
                    <button class="btn btn-primary" onclick="viewHistory()" style="padding: 12px 24px;">
                        📊 查看历史报告
                    </button>
                </div>
            </div>
        </div>

        <!-- 筛选区域 -->
        <div class="section filter-section">
            <h2>🔍 筛选测验</h2>
            <div class="filter-container">
                <div class="filter-item">
                    <label>🔎 搜索主题</label>
                    <input type="text" id="searchInput" placeholder="搜索主题..." />
                </div>
                <div class="filter-item">
                    <label>📊 难度</label>
                    <select id="difficultyFilter">
                        <option value="all">全部</option>
                        <option value="beginner">初级</option>
                        <option value="intermediate">中级</option>
                        <option value="advanced">高级</option>
                    </select>
                </div>
                <div class="filter-item">
                    <label>✅ 状态</label>
                    <select id="statusFilter">
                        <option value="all">全部</option>
                        <option value="completed">已完成</option>
                        <option value="in-progress">进行中</option>
                    </select>
                </div>
                <div class="filter-item">
                    <label>📅 时间范围</label>
                    <select id="timeFilter">
                        <option value="all">全部时间</option>
                        <option value="today">今天</option>
                        <option value="week">本周</option>
                        <option value="month">本月</option>
                        <option value="custom">自定义</option>
                    </select>
                </div>
                <div class="filter-item" id="customDateRange" style="display: none; min-width: 280px;">
                    <label>📆 自定义日期</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="date" id="startDate" style="flex: 1;" />
                        <span>至</span>
                        <input type="date" id="endDate" style="flex: 1;" />
                    </div>
                </div>
                <div class="filter-item">
                    <button class="btn btn-secondary" onclick="resetFilters()">重置</button>
                </div>
            </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-container">
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-value">${totalExams}</div>
                <div class="stat-label">总测验数</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${completedExams}</div>
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
                    <div class="quiz-card" data-difficulty="${quiz.difficulty}" data-status="completed" data-created-at="${quiz.submitted_at || quiz.created_at}">
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
                            <button class="btn btn-secondary" onclick="viewQuestions('${quiz.quiz_id}')">
                                查看题目
                            </button>
                            <button class="btn btn-primary" onclick="retakeQuiz('${quiz.quiz_id}')">
                                🔄 重做
                            </button>
                            <button class="btn" onclick="deleteExamRecord('${quiz.exam_id}')" style="background: #dc3545; color: white;">
                                🗑️ 删除记录
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
                    <div class="quiz-card" data-difficulty="${quiz.difficulty}" data-status="in-progress" data-created-at="${quiz.created_at}">
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
                            <button class="btn" onclick="abandonExam('${quiz.exam_id}', '${quiz.quiz_id}')" style="background: #6c757d; color: white;">
                                🚫 放弃答题
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${totalExams === 0 ? `
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
            window.location.href = '/result/' + quizId;
        }

        function continueQuiz(quizId) {
            window.location.href = '/quiz/' + quizId;
        }

        function retakeQuiz(quizId) {
            if (confirm('确定要重做这个测验吗？\\n\\n系统会清除草稿答案，并生成新的提交记录。')) {
                // 清除localStorage中的草稿
                localStorage.removeItem('quiz_' + quizId + '_draft');

                // 跳转到测验页面（动态路由）
                window.location.href = '/quiz/' + quizId;
            }
        }



        async function deleteExamRecord(examId) {
            if (!confirm('确定要删除这次考试记录吗？\\n\\n说明：此操作会删除本次提交记录和答案，但试卷和题目会保留，你可以重新答题。')) {
                return;
            }

            try {
                const response = await fetch('/api/delete-exam', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ exam_id: examId })
                });
                const data = await response.json();

                if (data.success) {
                    alert('考试记录已删除');
                    // 刷新页面
                    window.location.reload();
                } else {
                    alert('删除失败：' + (data.error || '未知错误'));
                }
            } catch (err) {
                console.error('删除考试记录失败:', err);
                alert('删除考试记录失败：' + err.message);
            }
        }

        function navigateToQuizSearchPage() {
            window.location.href = '/search-quizzes';
        }

        function navigateToQuestionSearchPage() {
            window.location.href = '/search-questions';
        }

        async function viewHistory() {
            try {
                // 简单反馈
                const button = document.querySelector('button[onclick="viewHistory()"]');
                let originalText = '';
                if (button) {
                    originalText = button.innerHTML;
                    button.disabled = true;
                    button.innerHTML = '🔄 生成中...';
                }

                const response = await fetch('/api/generate-history-report', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.reportUrl) {
                        window.open(data.reportUrl, '_blank');
                    } else {
                        alert('未收到报告链接');
                    }
                } else {
                    alert('生成报告失败');
                }
                
                if (button) {
                    button.disabled = false;
                    button.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Error generating history report:', error);
                alert('生成历史报告时出错');
                const button = document.querySelector('button[onclick="viewHistory()"]');
                if (button) {
                    button.disabled = false;
                    button.innerHTML = '📊 查看历史报告';
                }
            }
        }

        async function abandonExam(examId, quizId) {
            if (!confirm('确定要放弃这次测验吗？\\n\\n说明：这将删除此测验记录，但保留试卷。')) {
                return;
            }

            try {
                // 清除本地存储的草稿
                if (quizId) {
                    localStorage.removeItem('quiz_' + quizId + '_draft');
                    localStorage.removeItem('quiz_' + quizId + '_timer');
                }
                
                // 调用删除测验 API
                const response = await fetch('/api/delete-exam', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ exam_id: examId })
                });
                const data = await response.json();

                if (data.success) {
                    alert('已放弃测验，记录已删除');
                    window.location.reload();
                } else {
                    alert('操作失败：' + (data.error || '未知错误'));
                }
            } catch (err) {
                console.error('放弃测验失败:', err);
                alert('放弃测验失败：' + err.message);
            }
        }

        async function deleteQuizCompletely(quizId) {
            if (!confirm('确定要彻底删除这个试卷吗？\\n\\n⚠️ 警告：这将删除试卷、所有题目、答题记录和 AI 问答历史！\\n此操作不可撤销！')) {
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
                    alert('试卷已彻底删除');
                    window.location.reload();
                } else {
                    alert('删除失败：' + (data.error || '未知错误'));
                }
            } catch (err) {
                console.error('删除试卷失败:', err);
                alert('删除试卷失败：' + err.message);
            }
        }

        async function viewQuestions(quizId) {
            try {
                const response = await fetch('/api/quiz?quiz_id=' + quizId);
                const data = await response.json();

                const { quiz, questions } = data;

                // 构建题目列表HTML
                let html = '<div style="max-width: 800px; margin: 20px auto; padding: 20px; background: white; border-radius: 12px;">';
                html += '<h2 style="color: #667eea; margin-bottom: 20px;">📝 ' + quiz.topic + ' - 题目列表</h2>';

                questions.forEach((q, idx) => {
                    html += '<div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px;">';
                    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 10px;">';
                    html += '<strong style="color: #667eea;">第 ' + (idx + 1) + ' 题</strong>';
                    html += '<span style="background: #f0f0f0; padding: 4px 12px; border-radius: 12px; font-size: 12px;">' + q.score + ' 分</span>';
                    html += '</div>';
                    html += '<p style="margin: 10px 0; line-height: 1.6;">' + q.content + '</p>';

                    if (q.options && q.options.length > 0) {
                        html += '<div style="margin-top: 10px;">';
                        q.options.forEach((opt, i) => {
                            html += '<div style="padding: 8px; margin: 5px 0; background: #f9f9f9; border-radius: 4px;">';
                            html += String.fromCharCode(65 + i) + '. ' + opt;
                            html += '</div>';
                        });
                        html += '</div>';
                    }

                    if (q.knowledge_points && q.knowledge_points.length > 0) {
                        html += '<div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">';
                        q.knowledge_points.forEach(kp => {
                            html += '<span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">' + kp + '</span>';
                        });
                        html += '</div>';
                    }
                    html += '</div>';
                });

                html += '<button onclick="window.history.back()" style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">← 返回Dashboard</button>';
                html += '</div>';

                // 创建新窗口或在当前页面显示
                const newWindow = window.open('', '_blank');
                newWindow.document.write(
                    '<!DOCTYPE html>' +
                    '<html>' +
                    '<head>' +
                    '<meta charset="UTF-8">' +
                    '<title>' + quiz.topic + ' - 题目列表</title>' +
                    '<style>' +
                    'body {' +
                    '    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
                    '    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
                    '    min-height: 100vh;' +
                    '    padding: 20px;' +
                    '    margin: 0;' +
                    '}' +
                    '</style>' +
                    '</head>' +
                    '<body>' + html + '</body>' +
                    '</html>'
                );
            } catch (err) {
                console.error('加载题目失败:', err);
                alert('加载题目失败：' + err.message);
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

        // 筛选功能
        function applyFilters() {
            const searchValue = document.getElementById('searchInput').value.toLowerCase();
            const difficultyValue = document.getElementById('difficultyFilter').value;
            const statusValue = document.getElementById('statusFilter').value;
            const timeValue = document.getElementById('timeFilter').value;

            const allCards = document.querySelectorAll('.quiz-card');

            // 计算时间范围
            let startDate = null;
            let endDate = null;

            if (timeValue !== 'all') {
                const now = new Date();
                endDate = now;

                if (timeValue === 'today') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (timeValue === 'week') {
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                } else if (timeValue === 'month') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (timeValue === 'custom') {
                    const startInput = document.getElementById('startDate').value;
                    const endInput = document.getElementById('endDate').value;
                    if (startInput) startDate = new Date(startInput);
                    if (endInput) endDate = new Date(endInput + 'T23:59:59');
                }
            }

            allCards.forEach(card => {
                const topic = card.querySelector('.quiz-title').textContent.toLowerCase();
                const difficulty = card.getAttribute('data-difficulty');
                const status = card.getAttribute('data-status');
                const createdAt = new Date(card.getAttribute('data-created-at'));

                const matchSearch = searchValue === '' || topic.includes(searchValue);
                const matchDifficulty = difficultyValue === 'all' || difficulty === difficultyValue;
                const matchStatus = statusValue === 'all' || status === statusValue;

                let matchTime = true;
                if (timeValue !== 'all' && startDate && endDate) {
                    matchTime = createdAt >= startDate && createdAt <= endDate;
                }

                if (matchSearch && matchDifficulty && matchStatus && matchTime) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        function resetFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('difficultyFilter').value = 'all';
            document.getElementById('statusFilter').value = 'all';
            document.getElementById('timeFilter').value = 'all';
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            document.getElementById('customDateRange').style.display = 'none';
            applyFilters();
        }

        // 绑定筛选事件
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('searchInput').addEventListener('input', applyFilters);
            document.getElementById('difficultyFilter').addEventListener('change', applyFilters);
            document.getElementById('statusFilter').addEventListener('change', applyFilters);
            document.getElementById('timeFilter').addEventListener('change', function() {
                const customDateRange = document.getElementById('customDateRange');
                if (this.value === 'custom') {
                    customDateRange.style.display = 'flex';
                } else {
                    customDateRange.style.display = 'none';
                }
                applyFilters();
            });
            document.getElementById('startDate').addEventListener('change', applyFilters);
            document.getElementById('endDate').addEventListener('change', applyFilters);
        });
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
