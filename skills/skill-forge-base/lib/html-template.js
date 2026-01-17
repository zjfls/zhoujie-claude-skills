/**
 * 生成试卷HTML页面
 */
function generateQuizHTML(quiz, questions) {
    const difficultyMap = {
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级'
    };

    const difficultyClass = {
        'beginner': 'difficulty-beginner',
        'intermediate': 'difficulty-intermediate',
        'advanced': 'difficulty-advanced'
    };

    // 题目来源标签映射
    const getSourceLabel = (sourceType) => {
        const labels = {
            'interview': '面试题',
            'exam': '考试题',
            'official_doc': '官方文档',
            'community': '社区题库',
            'ai_generated': 'AI生成'
        };
        return labels[sourceType] || sourceType;
    };

    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quiz.topic} - Skill Forge测验</title>
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            gap: 20px;
        }

        /* 顶部栏 */
        .header {
            background: white;
            border-radius: 12px;
            padding: 20px 30px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }

        .header-left h1 {
            font-size: 24px;
            color: #333;
            margin-bottom: 8px;
        }

        .back-to-dashboard {
            display: inline-block;
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            transition: all 0.3s;
        }

        .back-to-dashboard:hover {
            color: #764ba2;
            transform: translateX(-3px);
        }

        .header-left .meta {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .difficulty-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
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

        .header-right {
            display: flex;
            gap: 20px;
            align-items: center;
        }

        .timer {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
        }

        .progress-info {
            font-size: 16px;
            color: #666;
        }

        /* 侧边栏 */
        .sidebar {
            flex: 0 0 200px;
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            height: fit-content;
            position: sticky;
            top: 20px;
        }

        .sidebar h3 {
            font-size: 18px;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }

        .question-nav {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }

        .question-nav-item {
            width: 40px;
            height: 40px;
            border: 2px solid #ddd;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: 600;
            color: #666;
            transition: all 0.3s;
        }

        .question-nav-item:hover {
            border-color: #667eea;
            background: #f0f4ff;
        }

        .question-nav-item.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-color: transparent;
        }

        .question-nav-item.answered {
            background: #d4edda;
            border-color: #28a745;
            color: #155724;
        }

        .question-nav-item.answered.active {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
        }

        /* 主体内容区 */
        .main-content {
            flex: 1;
            min-width: 0;
        }

        .question-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            display: none;
        }

        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .question-number {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
        }

        .question-score {
            font-size: 16px;
            color: #666;
        }

        .knowledge-tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
        }

        .knowledge-tag {
            background: #f0f4ff;
            color: #667eea;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
        }

        .source-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
            cursor: pointer;
            position: relative;
            transition: all 0.2s ease;
        }

        .source-badge:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .source-badge .source-tooltip {
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 400;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .source-badge .source-tooltip::before {
            content: '';
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%);
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 6px solid #333;
        }

        .source-badge:hover .source-tooltip {
            display: block;
        }

        .source-tooltip a {
            color: #7dd3fc;
            text-decoration: none;
        }

        .source-tooltip a:hover {
            text-decoration: underline;
        }

        .source-badge.interview {
            background: #e3f2fd;
            color: #1976d2;
        }

        .source-badge.exam {
            background: #fff3e0;
            color: #f57c00;
        }

        .source-badge.official_doc {
            background: #e8f5e9;
            color: #388e3c;
        }

        .source-badge.community {
            background: #f3e5f5;
            color: #7b1fa2;
        }

        .source-badge.ai_generated {
            background: #f5f5f5;
            color: #757575;
        }

        .question-content {
            font-size: 16px;
            line-height: 1.8;
            color: #333;
            margin-bottom: 25px;
            white-space: pre-wrap;
        }

        .question-options {
            margin-bottom: 25px;
        }

        .option-item {
            display: flex;
            align-items: flex-start;
            padding: 15px;
            margin-bottom: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .option-item:hover {
            border-color: #667eea;
            background: #f9fafb;
        }

        .option-item input[type="radio"],
        .option-item input[type="checkbox"] {
            margin-right: 12px;
            width: 20px;
            height: 20px;
            cursor: pointer;
        }

        .option-label {
            flex: 1;
            font-size: 15px;
            color: #333;
            line-height: 1.6;
            cursor: pointer;
        }

        .answer-textarea {
            width: 100%;
            min-height: 200px;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 15px;
            font-family: inherit;
            line-height: 1.6;
            resize: vertical;
            transition: border-color 0.3s;
        }

        .answer-textarea:focus {
            outline: none;
            border-color: #667eea;
        }

        .answer-textarea.code-editor {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            background: #282c34;
            color: #abb2bf;
        }

        /* 代码预览区域 */
        .code-preview {
            background: #282c34;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
            overflow-x: auto;
        }

        .code-preview pre {
            margin: 0;
        }

        .code-preview code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.5;
        }

        .question-actions {
            display: flex;
            gap: 15px;
            margin-top: 25px;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
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
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
        }

        .btn-secondary:hover {
            background: #f0f4ff;
        }

        /* 底部导航 */
        .bottom-nav {
            background: white;
            border-radius: 12px;
            padding: 20px 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .nav-buttons {
            display: flex;
            gap: 15px;
        }

        .progress-bar-container {
            flex: 1;
            max-width: 300px;
            margin: 0 20px;
        }

        .progress-bar-bg {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 4px;
            width: 0%;
            transition: width 0.3s;
        }

        .submit-btn {
            padding: 15px 40px;
            font-size: 16px;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .container {
                flex-direction: column;
            }

            .sidebar {
                flex: 1;
                position: static;
            }

            .question-nav {
                grid-template-columns: repeat(8, 1fr);
            }

            .header {
                padding: 15px 20px;
            }

            .header-left h1 {
                font-size: 20px;
            }

            .bottom-nav {
                flex-direction: column;
                gap: 15px;
            }

            .progress-bar-container {
                width: 100%;
                max-width: none;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <!-- 顶部栏 -->
    <div class="header">
        <div class="header-left">
            <a href="/dashboard" class="back-to-dashboard">← Dashboard</a>
            <h1>${quiz.topic}</h1>
            <div class="meta">
                <span class="difficulty-badge ${difficultyClass[quiz.difficulty]}">${difficultyMap[quiz.difficulty]}</span>
                <span style="color: #666;">共 ${quiz.question_count} 题</span>
                <span style="color: #666;">总分 ${totalScore} 分</span>
            </div>
        </div>
        <div class="header-right">
            <div class="progress-info" id="progress-text">已答 0/${quiz.question_count}</div>
        </div>
    </div>

    <div class="container">
        <!-- 侧边栏 -->
        <div class="sidebar">
            <h3>📋 题目导航</h3>
            <div class="question-nav">
                ${questions.map((q, i) => `
                    <div class="question-nav-item" data-question="${q.question_number}">
                        ${q.question_number}
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- 主体内容 -->
        <div class="main-content">
            <div id="quiz-container" data-quiz-id="${quiz.quiz_id}">
                ${questions.map((q, i) => generateQuestionCard(q)).join('')}
            </div>

            <!-- 底部导航 -->
            <div class="bottom-nav">
                <div class="nav-buttons">
                    <button class="btn btn-secondary" id="prev-question">← 上一题</button>
                    <button class="btn btn-secondary" id="next-question">下一题 →</button>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-bg">
                        <div class="progress-bar" id="progress-bar"></div>
                    </div>
                </div>
                <button class="btn btn-primary submit-btn" id="submit-quiz">提交试卷</button>
            </div>
        </div>
    </div>

    <script src="/quiz-engine.js"></script>
    <script>
        // 初始化代码高亮
        document.addEventListener('DOMContentLoaded', function() {
            // 高亮所有代码块
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            // 为代码题添加实时预览（可选）
            document.querySelectorAll('.code-editor').forEach(textarea => {
                textarea.addEventListener('input', function() {
                    // 可以添加实时语法高亮功能
                    // 这里只是简单示例，实际使用可以集成Monaco Editor或CodeMirror
                });
            });
        });
    </script>
</body>
</html>`;
}

// 题目来源标签映射（全局函数）
function getSourceLabel(sourceType) {
    const labels = {
        'interview': '面试题',
        'exam': '考试题',
        'official_doc': '官方文档',
        'community': '社区题库',
        'ai_generated': 'AI生成'
    };
    return labels[sourceType] || sourceType;
}

/**
 * 生成单个题目卡片
 */
function generateQuestionCard(question) {
    const typeMap = {
        'choice': '选择题',
        'multiple_choice': '多选题',
        'essay': '问答题',
        'code': '代码题'
    };

    let answerArea = '';

    if (question.question_type === 'choice') {
        // 单选题
        const options = question.options || [];
        answerArea = `
            <div class="question-options">
                ${options.map((opt, i) => `
                    <label class="option-item">
                        <input type="radio" name="question_${question.question_number}" value="${String.fromCharCode(65 + i)}">
                        <span class="option-label"><strong>${String.fromCharCode(65 + i)}.</strong> ${opt}</span>
                    </label>
                `).join('')}
            </div>
        `;
    } else if (question.question_type === 'multiple_choice') {
        // 多选题
        const options = question.options || [];
        answerArea = `
            <div class="question-options" data-type="multiple">
                <p style="color: #667eea; font-size: 14px; margin-bottom: 10px;">💡 提示：可多选</p>
                ${options.map((opt, i) => `
                    <label class="option-item">
                        <input type="checkbox" name="question_${question.question_number}" value="${String.fromCharCode(65 + i)}">
                        <span class="option-label"><strong>${String.fromCharCode(65 + i)}.</strong> ${opt}</span>
                    </label>
                `).join('')}
            </div>
        `;
    } else if (question.question_type === 'essay') {
        // 问答题
        answerArea = `
            <textarea class="answer-textarea" placeholder="请输入你的答案..."></textarea>
        `;
    } else if (question.question_type === 'code') {
        // 代码题
        answerArea = `
            <textarea class="answer-textarea code-editor" placeholder="请输入你的代码..."></textarea>
        `;
    }

    return `
        <div class="question-card" data-question="${question.question_number}">
            <div class="question-header">
                <div>
                    <span class="question-number">题目 ${question.question_number}</span>
                    <span style="color: #999; margin-left: 10px;">[${typeMap[question.question_type]}]</span>
                    ${question.source_type ? `
                        <span class="source-badge ${question.source_type}">
                            ${getSourceLabel(question.source_type)}
                            <span class="source-tooltip">
                                ${question.source_name ? `<strong>${question.source_name}</strong><br>` : ''}
                                ${question.source_url ? `<a href="${question.source_url}" target="_blank">🔗 查看原题</a>` : '来源：' + getSourceLabel(question.source_type)}
                            </span>
                        </span>
                    ` : ''}
                    <div class="knowledge-tags">
                        ${(question.knowledge_points || []).map(kp => `
                            <span class="knowledge-tag">${kp}</span>
                        `).join('')}
                    </div>
                </div>
                <span class="question-score">${question.score} 分</span>
            </div>

            <div class="question-content">${question.content}</div>

            ${answerArea}

            <div class="question-actions">
                <button class="btn btn-primary" onclick="SkillForge.askAI(${question.question_number})">💬 向AI提问</button>
            </div>
        </div>
    `;
}

module.exports = {
    generateQuizHTML
};
