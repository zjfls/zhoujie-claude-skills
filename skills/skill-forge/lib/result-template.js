/**
 * 生成成绩页面HTML
 */
function generateResultHTML(quiz, submission, questions, answers) {
    const percentage = (submission.obtained_score / submission.total_score * 100).toFixed(1);
    const passThreshold = 60;
    const isPassed = submission.pass_status === 'pass';

    // 统计各题型分数
    const typeStats = {};
    answers.forEach(answer => {
        const type = answer.question_type;
        if (!typeStats[type]) {
            typeStats[type] = { total: 0, obtained: 0, count: 0 };
        }
        const question = questions.find(q => q.id === answer.question_id);
        typeStats[type].total += question.score;
        typeStats[type].obtained += answer.score_obtained;
        typeStats[type].count++;
    });

    // 格式化用时
    const timeSpent = submission.time_spent || 0;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeText = `${minutes}分${seconds}秒`;

    // 错题列表
    const wrongAnswers = answers.filter(a => !a.is_correct);

    // 知识点统计
    const knowledgeStats = {};
    answers.forEach(answer => {
        const kps = answer.knowledge_points || [];
        kps.forEach(kp => {
            if (!knowledgeStats[kp]) {
                knowledgeStats[kp] = { correct: 0, total: 0 };
            }
            knowledgeStats[kp].total++;
            if (answer.is_correct) {
                knowledgeStats[kp].correct++;
            }
        });
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测验成绩 - ${quiz.topic}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
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
            max-width: 1000px;
            margin: 0 auto;
        }

        /* 顶部成绩卡片 */
        .score-card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            text-align: center;
        }

        .score-card h1 {
            font-size: 28px;
            color: #333;
            margin-bottom: 30px;
        }

        .score-display {
            display: flex;
            justify-content: center;
            align-items: baseline;
            gap: 10px;
            margin-bottom: 20px;
        }

        .score-main {
            font-size: 72px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .score-total {
            font-size: 36px;
            color: #999;
        }

        .percentage {
            font-size: 48px;
            font-weight: 600;
            color: ${isPassed ? '#28a745' : '#dc3545'};
            margin-bottom: 15px;
        }

        .pass-badge {
            display: inline-block;
            padding: 10px 30px;
            border-radius: 30px;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 25px;
        }

        .pass-badge.pass {
            background: #d4edda;
            color: #155724;
        }

        .pass-badge.fail {
            background: #f8d7da;
            color: #721c24;
        }

        .meta-info {
            display: flex;
            justify-content: center;
            gap: 40px;
            flex-wrap: wrap;
            color: #666;
            font-size: 16px;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* 统计卡片 */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .stat-card h3 {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #333;
            margin-bottom: 10px;
        }

        .stat-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }

        .stat-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 4px;
        }

        /* 知识点雷达图卡片 */
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
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .knowledge-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
        }

        .knowledge-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .knowledge-name {
            font-size: 14px;
            color: #333;
            font-weight: 600;
        }

        .knowledge-progress {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .knowledge-bar {
            flex: 1;
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
        }

        .knowledge-bar-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.5s ease;
        }

        .knowledge-percent {
            font-size: 13px;
            font-weight: 600;
            min-width: 40px;
            text-align: right;
        }

        /* 逐题分析 */
        .analysis-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .analysis-section h2 {
            font-size: 22px;
            color: #333;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .answer-item {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            transition: all 0.3s;
        }

        .answer-item.correct {
            border-color: #28a745;
            background: #f8fff9;
        }

        .answer-item.wrong {
            border-color: #dc3545;
            background: #fff8f8;
        }

        .answer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .answer-number {
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }

        .answer-score {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .score-badge {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        .score-badge.correct {
            background: #d4edda;
            color: #155724;
        }

        .score-badge.wrong {
            background: #f8d7da;
            color: #721c24;
        }

        .score-badge.partial {
            background: #fff3cd;
            color: #856404;
        }

        .question-text {
            font-size: 16px;
            line-height: 1.8;
            color: #333;
            margin-bottom: 15px;
            white-space: pre-wrap;
        }

        .answer-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }

        .answer-label {
            font-size: 14px;
            color: #666;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .answer-content {
            font-size: 15px;
            color: #333;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .answer-content.code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            background: #282c34;
            color: #abb2bf;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
        }

        .ai-feedback {
            background: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
        }

        .ai-feedback-title {
            font-size: 14px;
            font-weight: 600;
            color: #f57f17;
            margin-bottom: 8px;
        }

        .ai-feedback-content {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
        }

        .explanation {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
        }

        .explanation-title {
            font-size: 14px;
            font-weight: 600;
            color: #1565c0;
            margin-bottom: 8px;
        }

        .explanation-content {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
        }

        /* 错题本 */
        .wrong-answers-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .wrong-answers-section h2 {
            font-size: 22px;
            color: #dc3545;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .empty-wrong {
            text-align: center;
            padding: 40px;
            color: #28a745;
            font-size: 18px;
        }

        /* 操作按钮 */
        .action-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }

        .btn {
            padding: 15px 35px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
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

        /* 响应式设计 */
        @media (max-width: 768px) {
            .score-card {
                padding: 25px;
            }

            .score-main {
                font-size: 48px;
            }

            .score-total {
                font-size: 24px;
            }

            .percentage {
                font-size: 36px;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .meta-info {
                gap: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- 成绩卡片 -->
        <div class="score-card">
            <h1>🎓 测验成绩</h1>
            <div class="score-display">
                <span class="score-main">${submission.obtained_score.toFixed(1)}</span>
                <span class="score-total">/ ${submission.total_score}</span>
            </div>
            <div class="percentage">${percentage}%</div>
            <div class="pass-badge ${isPassed ? 'pass' : 'fail'}">
                ${isPassed ? '✓ 通过' : '✗ 未通过'}（及格线：${passThreshold}分）
            </div>
            <div class="meta-info">
                <div class="meta-item">
                    <span>📝</span>
                    <span>${quiz.topic}</span>
                </div>
                <div class="meta-item">
                    <span>⏱️</span>
                    <span>用时：${timeText}</span>
                </div>
                <div class="meta-item">
                    <span>📊</span>
                    <span>共 ${questions.length} 题</span>
                </div>
                <div class="meta-item">
                    <span>✅</span>
                    <span>${answers.filter(a => a.is_correct).length} 题正确</span>
                </div>
            </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-grid">
            ${Object.keys(typeStats).map(type => {
                const stat = typeStats[type];
                const typeNames = {
                    'choice': '单选题',
                    'multiple_choice': '多选题',
                    'essay': '问答题',
                    'code': '代码题'
                };
                const percent = (stat.obtained / stat.total * 100).toFixed(1);
                return `
                <div class="stat-card">
                    <h3>${typeNames[type]}</h3>
                    <div class="stat-value">${stat.obtained.toFixed(1)} / ${stat.total}</div>
                    <div style="color: #666; font-size: 14px;">${stat.count} 题 · 得分率 ${percent}%</div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>

        <!-- 知识点掌握情况 -->
        ${Object.keys(knowledgeStats).length > 0 ? `
        <div class="knowledge-card">
            <h2>🎯 知识点掌握情况</h2>
            <div class="knowledge-list">
                ${Object.keys(knowledgeStats).map(kp => {
                    const stat = knowledgeStats[kp];
                    const percent = (stat.correct / stat.total * 100).toFixed(0);
                    const color = percent >= 80 ? '#28a745' : percent >= 60 ? '#ffc107' : '#dc3545';
                    return `
                    <div class="knowledge-item">
                        <div class="knowledge-name">${kp}</div>
                        <div class="knowledge-progress">
                            <div class="knowledge-bar">
                                <div class="knowledge-bar-fill" style="width: ${percent}%; background: ${color};"></div>
                            </div>
                            <span class="knowledge-percent" style="color: ${color};">${percent}%</span>
                        </div>
                        <div style="font-size: 12px; color: #999;">${stat.correct}/${stat.total} 题正确</div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}

        <!-- 错题本 -->
        <div class="wrong-answers-section">
            <h2>📕 错题本 (${wrongAnswers.length})</h2>
            ${wrongAnswers.length === 0 ? `
                <div class="empty-wrong">
                    🎉 太棒了！全部答对，没有错题！
                </div>
            ` : `
                ${wrongAnswers.map(answer => {
                    const question = questions.find(q => q.id === answer.question_id);
                    return generateAnswerAnalysis(question, answer, true);
                }).join('')}
            `}
        </div>

        <!-- 逐题分析 -->
        <div class="analysis-section">
            <h2>📋 逐题分析</h2>
            ${answers.map(answer => {
                const question = questions.find(q => q.id === answer.question_id);
                return generateAnswerAnalysis(question, answer, false);
            }).join('')}
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="window.history.back()">← 返回</button>
            <button class="btn btn-secondary" onclick="viewHistory()">📊 查看历史记录</button>
            <button class="btn btn-primary" onclick="retakeQuiz()">🔄 重新测验</button>
            <button class="btn btn-primary" onclick="generateLearningPlan()" style="background: linear-gradient(135deg, #43e97b, #38f9d7);">
                📚 生成学习计划
            </button>
        </div>
    </div>

    <script>
        // 代码高亮
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        });

        function viewHistory() {
            window.location.href = '/dashboard';
        }

        function retakeQuiz() {
            if (confirm('确定要重做这个测验吗？\\n\\n系统会清除草稿答案，并生成新的提交记录。')) {
                // 清除localStorage中的草稿
                localStorage.removeItem('quiz_${quiz.quiz_id}_draft');

                // 跳转到测验页面
                window.location.href = '/quizzes/${quiz.quiz_id}/quiz.html';
            }
        }

        // ==================== 学习计划生成功能 ====================

        async function generateLearningPlan() {
            // 分析薄弱知识点
            const weakPoints = analyzeWeakPoints();

            if (weakPoints.critical.length === 0 && weakPoints.moderate.length === 0) {
                alert('🎉 恭喜！你已经掌握了所有知识点，无需额外学习。\\n\\n建议：可以挑战更高难度的测验。');
                return;
            }

            // 显示加载动画
            showLoadingModal();

            try {
                // 调用后端 API 生成 AI 学习计划
                const response = await fetch('/api/generate-ai-learning-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        submission_id: '${submission.submission_id}'
                    })
                });

                if (!response.ok) {
                    throw new Error('生成学习计划失败');
                }

                const data = await response.json();
                const learningPlan = data.learningPlan;

                // 关闭加载动画
                closeLoadingModal();

                // 显示学习计划模态框
                showLearningPlanModal(learningPlan, weakPoints);

            } catch (error) {
                closeLoadingModal();
                alert('❌ 生成学习计划失败：' + error.message + '\\n\\n请稍后重试。');
                console.error('生成学习计划失败:', error);
            }
        }

        function analyzeWeakPoints() {
            const knowledgeStats = ${JSON.stringify(knowledgeStats)};

            const critical = [];   // 掌握率 < 60%
            const moderate = [];   // 掌握率 60-80%
            const good = [];       // 掌握率 >= 80%

            for (const [kp, stat] of Object.entries(knowledgeStats)) {
                const percent = (stat.correct / stat.total * 100);
                const item = {
                    name: kp,
                    percent: percent.toFixed(1),
                    correct: stat.correct,
                    total: stat.total
                };

                if (percent < 60) {
                    critical.push(item);
                } else if (percent < 80) {
                    moderate.push(item);
                } else {
                    good.push(item);
                }
            }

            // 按掌握率排序（从低到高）
            critical.sort((a, b) => parseFloat(a.percent) - parseFloat(b.percent));
            moderate.sort((a, b) => parseFloat(a.percent) - parseFloat(b.percent));

            return { critical, moderate, good };
        }

        function showLoadingModal() {
            const modal = document.createElement('div');
            modal.id = 'loading-modal';
            modal.style.cssText = \`
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                animation: fadeIn 0.3s ease;
            \`;

            modal.innerHTML = \`
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #667eea;
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        animation: spin 1s linear infinite;
                    "></div>
                    <h3 style="color: #333; font-size: 20px; margin-bottom: 10px;">
                        🤖 AI 正在分析你的测验结果
                    </h3>
                    <p style="color: #666; font-size: 14px;">
                        分析错题原因，生成个性化学习计划...<br>
                        这可能需要 30-60 秒
                    </p>
                </div>
            \`;

            const style = document.createElement('style');
            style.textContent = \`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            \`;
            document.head.appendChild(style);

            document.body.appendChild(modal);
        }

        function closeLoadingModal() {
            const modal = document.getElementById('loading-modal');
            if (modal) {
                document.body.removeChild(modal);
            }
        }

        function showLearningPlanModal(learningPlan, weakPoints) {
            const analysis = learningPlan.analysis || {};
            const stats = learningPlan.stats || {};
            const prompt = learningPlan.deepLearningPrompt || '';
            const suggestions = learningPlan.suggestions || [];
            const focusAreas = learningPlan.focusAreas || [];

            // 创建模态框
            const modal = document.createElement('div');
            modal.id = 'learning-plan-modal';
            modal.style.cssText = \`
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            \`;

            const totalWeak = stats.critical?.length || 0 + stats.moderate?.length || 0;
            const criticalList = (stats.critical || []).map(p => \`<span style="display: inline-block; margin: 4px 8px 4px 0;">\${p.name} <strong style="color: #dc3545;">(\${p.percent}%)</strong></span>\`).join('');
            const moderateList = (stats.moderate || []).map(p => \`<span style="display: inline-block; margin: 4px 8px 4px 0;">\${p.name} <strong style="color: #ffc107;">(\${p.percent}%)</strong></span>\`).join('');

            modal.innerHTML = \`
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 35px;
                    max-width: 750px;
                    width: 100%;
                    max-height: 85vh;
                    overflow-y: auto;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    animation: slideUp 0.3s ease;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px;">
                        <h2 style="color: #333; font-size: 26px; margin: 0;">
                            📚 个性化学习计划
                        </h2>
                        <button onclick="closeModal()" style="
                            background: none;
                            border: none;
                            font-size: 28px;
                            color: #999;
                            cursor: pointer;
                            line-height: 1;
                            padding: 0;
                            width: 32px;
                            height: 32px;
                        ">&times;</button>
                    </div>

                    <div style="background: linear-gradient(135deg, #fff5f5 0%, #fff8e1 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
                        <h3 style="color: #666; font-size: 17px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 20px;">📊</span> 薄弱知识点分析
                        </h3>
                        \${(stats.critical?.length || 0) > 0 ? \`
                            <div style="margin-bottom: 12px;">
                                <div style="font-weight: 600; color: #dc3545; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 18px;">🔴</span> 急需加强（\${stats.critical.length} 个知识点）
                                </div>
                                <div style="color: #666; line-height: 1.8;">
                                    \${criticalList}
                                </div>
                            </div>
                        \` : ''}
                        \${(stats.moderate?.length || 0) > 0 ? \`
                            <div>
                                <div style="font-weight: 600; color: #f57f17; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 18px;">🟡</span> 需要巩固（\${stats.moderate.length} 个知识点）
                                </div>
                                <div style="color: #666; line-height: 1.8;">
                                    \${moderateList}
                                </div>
                            </div>
                        \` : ''}
                    </div>

                    <!-- AI 错误原因分析 -->
                    \${analysis.errorReasons && analysis.errorReasons.length > 0 ? \`
                    <div style="background: linear-gradient(135deg, #e3f2fd 0%, #e1f5fe 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                        <h3 style="color: #1565c0; font-size: 17px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 20px;">🤖</span> AI 错误原因分析
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">
                            \${analysis.errorReasons.map(reason => \`<li style="margin-bottom: 8px;">\${reason}</li>\`).join('')}
                        </ul>
                        <div style="margin-top: 15px; padding: 12px; background: white; border-radius: 8px; font-size: 14px; color: #555;">
                            <strong>📖 学习范围建议：</strong> <span style="color: #1565c0; font-weight: 600;">\${analysis.learningScope}</span><br>
                            <span style="font-size: 13px; color: #777;">\${analysis.scopeReason}</span>
                        </div>
                    </div>
                    \` : ''}

                    <!-- 学习建议 -->
                    \${suggestions && suggestions.length > 0 ? \`
                    <div style="background: linear-gradient(135deg, #f3e5f5 0%, #fce4ec 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #9c27b0;">
                        <h3 style="color: #6a1b9a; font-size: 17px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 20px;">💡</span> 学习建议
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #666; line-height: 1.9;">
                            \${suggestions.map(suggestion => \`<li style="margin-bottom: 10px;">\${suggestion}</li>\`).join('')}
                        </ol>
                    </div>
                    \` : ''}

                    <!-- Deep Learning 提示词 -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="color: #666; margin: 0; line-height: 1.7; font-size: 15px;">
                            <strong style="color: #333;">📚 下一步操作：</strong><br>
                            AI 已为你生成个性化学习提示词。复制后在 Claude Code 中粘贴，即可自动搜集针对性学习资料。
                        </p>
                    </div>

                    <div style="position: relative; margin-bottom: 25px;">
                        <textarea id="learning-prompt" readonly style="
                            width: 100%;
                            height: 320px;
                            padding: 18px;
                            border: 2px solid #e0e0e0;
                            border-radius: 10px;
                            font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
                            font-size: 13px;
                            line-height: 1.7;
                            resize: vertical;
                            color: #333;
                            background: #f8f9fa;
                        ">\${prompt}</textarea>

                        <button onclick="copyPrompt(event)" style="
                            position: absolute;
                            top: 12px;
                            right: 12px;
                            padding: 10px 18px;
                            background: linear-gradient(135deg, #667eea, #764ba2);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                            transition: all 0.3s ease;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)';">
                            📋 复制
                        </button>
                    </div>

                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button onclick="closeModal()" style="
                            padding: 13px 28px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='#5a6268';" onmouseout="this.style.background='#6c757d';">
                            关闭
                        </button>
                        <button onclick="copyAndClose()" style="
                            padding: 13px 28px;
                            background: linear-gradient(135deg, #43e97b, #38f9d7);
                            color: white;
                            border: none;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 600;
                            box-shadow: 0 2px 8px rgba(67, 233, 123, 0.3);
                            transition: all 0.3s ease;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(67, 233, 123, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(67, 233, 123, 0.3)';">
                            复制并关闭 ✓
                        </button>
                    </div>
                </div>
            \`;

            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = \`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            \`;
            document.head.appendChild(style);

            document.body.appendChild(modal);

            // 添加全局函数
            window.closeModal = function() {
                const modal = document.getElementById('learning-plan-modal');
                if (modal) {
                    modal.style.animation = 'fadeOut 0.3s ease';
                    setTimeout(() => {
                        document.body.removeChild(modal);
                    }, 300);
                }
            };

            window.copyPrompt = function(event) {
                const textarea = document.getElementById('learning-prompt');
                textarea.select();
                textarea.setSelectionRange(0, 99999); // 移动端兼容

                try {
                    document.execCommand('copy');

                    // 显示复制成功提示
                    const btn = event.target;
                    const originalText = btn.textContent;
                    btn.textContent = '✓ 已复制';
                    btn.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';

                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                    }, 2000);
                } catch (err) {
                    alert('复制失败，请手动复制');
                }
            };

            window.copyAndClose = function() {
                const textarea = document.getElementById('learning-prompt');
                textarea.select();
                textarea.setSelectionRange(0, 99999);

                try {
                    document.execCommand('copy');
                    closeModal();

                    setTimeout(() => {
                        alert('✓ 提示词已复制到剪贴板！\\n\\n请在 Claude Code 中粘贴，即可自动生成个性化学习计划。');
                    }, 400);
                } catch (err) {
                    alert('复制失败，请手动复制');
                }
            };

            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

            // ESC键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    </script>
</body>
</html>`;
}

/**
 * 生成单个答案分析
 */
function generateAnswerAnalysis(question, answer, isWrongOnly) {
    const isCorrect = answer.is_correct;
    const isPartial = !isCorrect && answer.score_obtained > 0;

    const typeNames = {
        'choice': '单选题',
        'multiple_choice': '多选题',
        'essay': '问答题',
        'code': '代码题'
    };

    let userAnswerDisplay = answer.user_answer;
    let correctAnswerDisplay = question.correct_answer;

    // 代码题使用高亮
    if (question.question_type === 'code') {
        userAnswerDisplay = `<pre><code class="language-javascript">${escapeHtml(answer.user_answer)}</code></pre>`;
        correctAnswerDisplay = `<pre><code class="language-javascript">${escapeHtml(question.correct_answer)}</code></pre>`;
    } else {
        userAnswerDisplay = escapeHtml(answer.user_answer);
        correctAnswerDisplay = escapeHtml(question.correct_answer);
    }

    return `
        <div class="answer-item ${isCorrect ? 'correct' : 'wrong'}">
            <div class="answer-header">
                <div>
                    <span class="answer-number">题目 ${question.question_number}</span>
                    <span style="color: #999; margin-left: 10px;">[${typeNames[question.question_type]}]</span>
                </div>
                <div class="answer-score">
                    <span class="score-badge ${isCorrect ? 'correct' : (isPartial ? 'partial' : 'wrong')}">
                        ${isCorrect ? '✓ 正确' : (isPartial ? '△ 部分正确' : '✗ 错误')}
                    </span>
                    <span style="color: #666;">${answer.score_obtained.toFixed(1)} / ${question.score} 分</span>
                </div>
            </div>

            <div class="question-text">${escapeHtml(question.content)}</div>

            ${question.options ? `
                <div class="answer-section">
                    <div class="answer-label">
                        ${question.question_type === 'multiple_choice' ? '选项（可多选）：' : '选项：'}
                    </div>
                    ${(Array.isArray(question.options) ? question.options : JSON.parse(question.options)).map((opt, i) =>
                        `<div style="margin: 5px 0;">${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</div>`
                    ).join('')}
                </div>
            ` : ''}

            <div class="answer-section">
                <div class="answer-label">你的答案：</div>
                <div class="answer-content ${question.question_type === 'code' ? 'code' : ''}">
                    ${userAnswerDisplay || '未作答'}
                </div>
            </div>

            ${!isCorrect ? `
                <div class="answer-section">
                    <div class="answer-label">正确答案：</div>
                    <div class="answer-content ${question.question_type === 'code' ? 'code' : ''}">
                        ${correctAnswerDisplay}
                    </div>
                </div>
            ` : ''}

            ${answer.ai_feedback ? `
                <div class="ai-feedback">
                    <div class="ai-feedback-title">🤖 AI评分反馈</div>
                    <div class="ai-feedback-content">${escapeHtml(answer.ai_feedback)}</div>
                </div>
            ` : ''}

            ${question.explanation ? `
                <div class="explanation">
                    <div class="explanation-title">💡 题目解析</div>
                    <div class="explanation-content">${escapeHtml(question.explanation)}</div>
                </div>
            ` : ''}
        </div>
    `;
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
    generateResultHTML
};
