const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const { db, DATA_DIR, QUIZZES_DIR, HISTORY_DIR } = require('./database');
const { generateResultHTML } = require('./result-template');
const { generateHistoryHTML } = require('./history-template');
const os = require('os');

// 读取配置文件
const CONFIG_PATH = path.join(os.homedir(), '.skill-forge', 'config.json');
let config = {
    ai: {
        model: 'mcs-1',
        timeout: 120000,
        cliCommand: 'claude'
    },
    server: {
        port: 3457
    }
};

try {
    if (fs.existsSync(CONFIG_PATH)) {
        const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
        config = JSON.parse(configContent);
        console.log(`✓ 配置已加载: ${CONFIG_PATH}`);
        console.log(`✓ AI 模型: ${config.ai.model}`);
    }
} catch (err) {
    console.warn('⚠️ 配置文件读取失败，使用默认配置:', err.message);
}

const PORT = config.server.port || 3457;
const AI_TIMEOUT = config.ai.timeout || 120000;
const AI_MODEL = config.ai.model || 'mcs-1';
const CLAUDE_CLI = config.ai.cliCommand || 'claude';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

// AI请求状态管理（内存中）
const aiRequestsMap = new Map();

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`${req.method} ${pathname}`);

    try {
        // ==================== 静态文件服务 ====================

        // 前端脚本
        if (pathname === '/quiz-engine.js') {
            const scriptPath = path.join(__dirname, 'quiz-engine.js');
            fs.readFile(scriptPath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('quiz-engine.js not found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
                res.end(data);
            });
            return;
        }

        // 试卷和历史文件
        if (pathname.startsWith('/quizzes/') || pathname.startsWith('/history/')) {
            const filePath = path.join(DATA_DIR, pathname);

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

        // ==================== API端点 ====================

        // 获取试卷数据
        if (pathname === '/api/quiz' && req.method === 'GET') {
            const quiz_id = parsedUrl.query.quiz_id;
            if (!quiz_id) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing quiz_id' }));
                return;
            }

            const quiz = await db.getQuiz(quiz_id);
            const questions = await db.getQuestions(quiz_id);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ quiz, questions }));
            return;
        }

        // AI提问
        if (pathname === '/api/ask-ai' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { quiz_id, question_number, user_query } = data;

                    if (!quiz_id || !question_number || !user_query) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing required fields' }));
                        return;
                    }

                    // 生成请求ID
                    const requestId = `${quiz_id}_q${question_number}_${Date.now()}`;

                    // 设置初始状态
                    aiRequestsMap.set(requestId, {
                        status: 'processing',
                        startTime: Date.now()
                    });

                    // 立即返回requestId
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ requestId, message: 'AI请求已提交' }));

                    // 异步处理AI请求
                    handleAIRequest(requestId, quiz_id, question_number, user_query);

                } catch (err) {
                    console.error('解析请求失败:', err);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }

        // 查询AI请求状态
        if (pathname === '/api/ai-status' && req.method === 'GET') {
            const requestId = parsedUrl.query.requestId;
            if (!requestId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing requestId' }));
                return;
            }

            const status = aiRequestsMap.get(requestId);
            if (!status) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request not found' }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
        }

        // 提交试卷
        if (pathname === '/api/submit-quiz' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { quiz_id, answers, time_spent } = data;

                    if (!quiz_id || !answers) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing required fields' }));
                        return;
                    }

                    // 获取题目
                    const questions = await db.getQuestions(quiz_id);

                    // 评分
                    const results = await gradeQuiz(questions, answers);

                    // 计算总分
                    const total_score = questions.reduce((sum, q) => sum + q.score, 0);
                    const obtained_score = results.reduce((sum, r) => sum + r.score_obtained, 0);
                    const pass_status = obtained_score >= total_score * 0.6 ? 'pass' : 'fail';

                    // 保存提交记录
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                    const submission_id = `${quiz_id}_${timestamp}`;

                    await db.createSubmission({
                        submission_id,
                        quiz_id,
                        total_score,
                        obtained_score,
                        time_spent,
                        pass_status
                    });

                    // 保存答案
                    const answerRecords = results.map(r => ({
                        submission_id,
                        question_id: r.question_id,
                        user_answer: r.user_answer,
                        is_correct: r.is_correct,
                        score_obtained: r.score_obtained,
                        ai_feedback: r.ai_feedback
                    }));

                    await db.insertAnswers(answerRecords);

                    // 更新试卷状态
                    await db.updateQuizStatus(quiz_id, 'completed');

                    // 生成成绩页面HTML
                    const quiz = await db.getQuiz(quiz_id);
                    const submission = {
                        submission_id,
                        quiz_id,
                        submitted_at: new Date().toISOString(),
                        total_score,
                        obtained_score,
                        time_spent,
                        pass_status
                    };
                    const answersWithDetails = await db.getAnswers(submission_id);

                    const resultHTML = generateResultHTML(quiz, submission, questions, answersWithDetails);
                    const resultPath = path.join(QUIZZES_DIR, quiz_id, 'result.html');
                    fs.writeFileSync(resultPath, resultHTML, 'utf8');
                    console.log(`✓ 成绩页面已生成: ${resultPath}`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        submission_id,
                        total_score,
                        obtained_score,
                        pass_status,
                        results
                    }));

                } catch (err) {
                    console.error('提交失败:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }

        // 获取历史记录
        if (pathname === '/api/history' && req.method === 'GET') {
            const quizzes = await db.getAllQuizzes();
            const stats = await db.getStatistics();
            const wrongQuestions = await db.getWrongQuestions();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ quizzes, stats, wrongQuestions }));
            return;
        }

        // 生成历史报告页面
        if (pathname === '/api/generate-history-report' && req.method === 'POST') {
            try {
                const quizzes = await db.getAllQuizzes();
                const stats = await db.getStatistics();
                const wrongQuestions = await db.getWrongQuestions();

                const historyHTML = generateHistoryHTML(quizzes, stats, wrongQuestions);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const reportPath = path.join(HISTORY_DIR, `report_${timestamp}.html`);

                fs.writeFileSync(reportPath, historyHTML, 'utf8');
                console.log(`✓ 历史报告已生成: ${reportPath}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    reportUrl: `/history/report_${timestamp}.html`
                }));
            } catch (err) {
                console.error('生成历史报告失败:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // AI生成学习计划
        if (pathname === '/api/generate-ai-learning-plan' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { submission_id } = data;

                    if (!submission_id) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing submission_id' }));
                        return;
                    }

                    console.log(`正在生成学习计划: ${submission_id}`);

                    // 获取测验数据
                    const submission = await db.getSubmission(submission_id);
                    const quiz = await db.getQuiz(submission.quiz_id);
                    const questions = await db.getQuestions(submission.quiz_id);
                    const answers = await db.getAnswers(submission_id);

                    // 调用AI生成学习计划
                    const learningPlan = await generateAILearningPlan(quiz, submission, questions, answers);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        learningPlan
                    }));

                } catch (err) {
                    console.error('生成学习计划失败:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }

        // 404
        res.writeHead(404);
        res.end('Not found');

    } catch (error) {
        console.error('服务器错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
});

/**
 * 异步处理AI请求
 */
async function handleAIRequest(requestId, quiz_id, question_number, user_query) {
    try {
        // 获取题目信息
        const question = await db.getQuestion(quiz_id, question_number);
        const quiz = await db.getQuiz(quiz_id);

        if (!question) {
            aiRequestsMap.set(requestId, {
                status: 'error',
                error: '题目不存在'
            });
            return;
        }

        // 构建AI提示词
        const aiPrompt = `
你是一位耐心的导师，学生正在做关于"${quiz.topic}"的测验。

题目 #${question_number}：
${question.content}

${question.options ? `选项：\n${JSON.parse(question.options).map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}` : ''}

知识点：${question.knowledge_points.join('、')}

学生提问：${user_query}

请用清晰易懂的语言回答，注意：
1. 不要直接给出答案
2. 引导学生思考
3. 提供相关知识点解释
4. 举例说明（如果适用）

回答格式为HTML片段（不需要完整HTML结构，只需要<div>、<p>、<code>等标签）：
`;

        console.log('调用Claude CLI生成AI回答...');

        const claudeProcess = spawn(CLAUDE_CLI, [
            '--print',
            '--model', AI_MODEL
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
            console.log('AI请求超时');
        }, AI_TIMEOUT);

        claudeProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        claudeProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        claudeProcess.on('close', async (code) => {
            clearTimeout(timeoutId);

            if (isTimeout) {
                aiRequestsMap.set(requestId, {
                    status: 'error',
                    error: 'AI请求超时（120秒），请稍后重试'
                });
                return;
            }

            if (code !== 0) {
                console.error('Claude CLI执行失败，退出码:', code);
                aiRequestsMap.set(requestId, {
                    status: 'error',
                    error: `AI生成失败: ${errorOutput}`
                });
                return;
            }

            // 提取HTML内容
            let htmlContent = output.trim();

            // 保存到数据库
            await db.saveAIInteraction(quiz_id, question_number, user_query, htmlContent);

            // 更新状态
            aiRequestsMap.set(requestId, {
                status: 'success',
                response: htmlContent,
                completedTime: Date.now()
            });

            console.log('AI回答生成成功');
        });

        // 发送提示词
        claudeProcess.stdin.write(aiPrompt);
        claudeProcess.stdin.end();

    } catch (error) {
        console.error('AI请求处理失败:', error);
        aiRequestsMap.set(requestId, {
            status: 'error',
            error: error.message
        });
    }
}

/**
 * 评分函数
 */
async function gradeQuiz(questions, answers) {
    const results = [];

    for (const question of questions) {
        const userAnswer = answers[question.question_number];
        let is_correct = false;
        let score_obtained = 0;
        let ai_feedback = '';

        if (!userAnswer || userAnswer.trim() === '') {
            // 未作答
            results.push({
                question_id: question.id,
                user_answer: userAnswer || '',
                is_correct: false,
                score_obtained: 0,
                ai_feedback: '未作答'
            });
            continue;
        }

        if (question.question_type === 'choice') {
            // 选择题：直接比对
            is_correct = userAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();
            score_obtained = is_correct ? question.score : 0;
            ai_feedback = is_correct ? '回答正确！' : `正确答案是：${question.correct_answer}`;

        } else {
            // 问答题/代码题：使用AI评分
            const gradeResult = await gradeWithAI(question, userAnswer);
            is_correct = gradeResult.is_correct;
            score_obtained = gradeResult.score;
            ai_feedback = gradeResult.feedback;
        }

        results.push({
            question_id: question.id,
            user_answer: userAnswer,
            is_correct,
            score_obtained,
            ai_feedback
        });
    }

    return results;
}

/**
 * 使用AI评分（问答题/代码题）
 */
async function gradeWithAI(question, userAnswer) {
    return new Promise((resolve) => {
        const aiPrompt = `
请为以下答案打分（满分${question.score}分）：

题目：${question.content}
题型：${question.question_type === 'code' ? '代码题' : '问答题'}
标准答案：${question.correct_answer}
用户答案：${userAnswer}

评分标准：
- 完全正确：满分
- 基本正确（有小瑕疵）：70%-90%分数
- 部分正确：40%-70%分数
- 基本错误：0%-40%分数

输出JSON格式（只输出JSON，不要其他文字）：
{
    "score": 数字（0-${question.score}，保留1位小数）,
    "feedback": "详细反馈（50-100字）",
    "is_correct": true/false（得分>=60%为true）
}
`;

        const claudeProcess = spawn(CLAUDE_CLI, [
            '--print',
            '--model', AI_MODEL
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        let output = '';

        claudeProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        claudeProcess.on('close', (code) => {
            if (code !== 0) {
                resolve({
                    score: 0,
                    feedback: 'AI评分失败，请手动审核',
                    is_correct: false
                });
                return;
            }

            try {
                // 提取JSON
                const jsonMatch = output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    resolve(result);
                } else {
                    resolve({
                        score: 0,
                        feedback: 'AI评分格式错误',
                        is_correct: false
                    });
                }
            } catch (err) {
                resolve({
                    score: 0,
                    feedback: 'AI评分解析失败',
                    is_correct: false
                });
            }
        });

        claudeProcess.stdin.write(aiPrompt);
        claudeProcess.stdin.end();
    });
}

/**
 * 使用AI生成个性化学习计划
 */
async function generateAILearningPlan(quiz, submission, questions, answers) {
    return new Promise((resolve, reject) => {
        // 分析薄弱知识点
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

        const critical = [];
        const moderate = [];
        for (const [kp, stat] of Object.entries(knowledgeStats)) {
            const percent = (stat.correct / stat.total * 100);
            if (percent < 60) {
                critical.push({ name: kp, percent: percent.toFixed(1), ...stat });
            } else if (percent < 80) {
                moderate.push({ name: kp, percent: percent.toFixed(1), ...stat });
            }
        }

        // 收集错题详情
        const wrongAnswers = answers.filter(a => !a.is_correct).slice(0, 5); // 最多分析5道错题
        const wrongDetails = wrongAnswers.map(answer => {
            const question = questions.find(q => q.id === answer.question_id);
            return {
                question_number: question.question_number,
                question_type: question.question_type,
                content: question.content,
                options: question.options,
                user_answer: answer.user_answer,
                correct_answer: question.correct_answer,
                knowledge_points: question.knowledge_points,
                ai_feedback: answer.ai_feedback
            };
        });

        // 构建AI提示词
        const percentage = (submission.obtained_score / submission.total_score * 100).toFixed(1);
        const aiPrompt = `你是一位专业的学习规划师。请分析以下测验结果，生成个性化的学习计划。

## 测验信息
- 主题：${quiz.topic}${quiz.topic_detail ? ' - ' + quiz.topic_detail : ''}
- 难度：${quiz.difficulty === 'beginner' ? '初级' : quiz.difficulty === 'intermediate' ? '中级' : '高级'}
- 得分：${submission.obtained_score}/${submission.total_score}（${percentage}%）
- 题目总数：${questions.length}
- 正确题数：${answers.filter(a => a.is_correct).length}

## 薄弱知识点统计
${critical.length > 0 ? `
### 急需加强（掌握率 < 60%）
${critical.map(kp => `- ${kp.name}：${kp.percent}%（${kp.correct}/${kp.total}题正确）`).join('\n')}
` : ''}
${moderate.length > 0 ? `
### 需要巩固（掌握率 60-80%）
${moderate.map(kp => `- ${kp.name}：${kp.percent}%（${kp.correct}/${kp.total}题正确）`).join('\n')}
` : ''}

## 错题详情分析
${wrongDetails.map((wd, idx) => `
### 错题 ${idx + 1}：${wd.question_type === 'choice' ? '选择题' : wd.question_type === 'code' ? '代码题' : '问答题'}
**题目**：${wd.content}
${wd.options ? `**选项**：${JSON.stringify(wd.options)}` : ''}
**你的答案**：${wd.user_answer || '未作答'}
**正确答案**：${wd.correct_answer}
**知识点**：${wd.knowledge_points.join('、')}
${wd.ai_feedback ? `**AI反馈**：${wd.ai_feedback}` : ''}
`).join('\n')}

## 请你完成以下任务

### 1. 错误原因分析
分析用户在这些错题上犯错的根本原因（不是表面原因）。例如：
- 是概念理解不清？
- 是知识点混淆？
- 是粗心大意？
- 是缺乏实践经验？

### 2. 学习范围判断
基于测验结果，判断用户应该选择的学习范围：
- 入门级：需要系统性学习基础
- 进阶级：有一定基础但需要深入
- 专家级：基础扎实，冲刺高级内容

### 3. 生成 Deep Learning Skill 提示词
生成一个完整的、可以直接使用的提示词，用于调用 deep-learning skill。

**提示词格式要求**：
\`\`\`
帮我搜集关于「{主题}」的学习资料

📊 我刚完成了一次测验，以下是我的薄弱知识点分析：

{薄弱点列表}

📋 AI 分析：
{错误原因分析}

📚 请为我定制学习资料：
1. 学习主题：{主题}
2. 学习范围：{范围}（{原因}）
3. 重点关注：{知识点列表}
4. 学习偏好：
   • 语言：中英文都可以，优先权威资源
   • 需要实战项目和代码示例
   • 重点关注：{资源类型建议}
   • 生成结构化的学习路径和 HTML 学习指南
\`\`\`

### 4. 学习建议
给出3-5条具体的学习建议，包括：
- 应该先学什么，后学什么
- 推荐的学习方法
- 避免的常见误区

## 输出格式（JSON）
请严格按照以下JSON格式输出（不要包含任何其他文字）：

\`\`\`json
{
    "analysis": {
        "errorReasons": ["原因1", "原因2", "原因3"],
        "learningScope": "入门级/进阶级/专家级",
        "scopeReason": "为什么选择这个范围的详细解释"
    },
    "deepLearningPrompt": "完整的提示词文本",
    "suggestions": [
        "建议1",
        "建议2",
        "建议3"
    ],
    "focusAreas": ["重点领域1", "重点领域2"],
    "resourceTypes": ["books", "tutorials", "papers", "projects"]
}
\`\`\`
`;

        console.log('调用Claude CLI生成学习计划...');

        const claudeProcess = spawn(CLAUDE_CLI, [
            '--print',
            '--model', AI_MODEL
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        let output = '';
        let errorOutput = '';
        let timeoutId;

        // 设置超时（60秒）
        timeoutId = setTimeout(() => {
            claudeProcess.kill();
            reject(new Error('AI生成学习计划超时'));
        }, 60000);

        claudeProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        claudeProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        claudeProcess.on('close', (code) => {
            clearTimeout(timeoutId);

            if (code !== 0) {
                console.error('Claude CLI执行失败:', errorOutput);
                reject(new Error(`AI生成失败: ${errorOutput}`));
                return;
            }

            try {
                // 提取JSON
                const jsonMatch = output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);

                    // 添加统计数据
                    result.stats = {
                        critical: critical,
                        moderate: moderate,
                        score: percentage,
                        totalQuestions: questions.length,
                        correctCount: answers.filter(a => a.is_correct).length
                    };

                    resolve(result);
                } else {
                    reject(new Error('AI输出格式错误：未找到JSON'));
                }
            } catch (err) {
                console.error('解析AI输出失败:', err);
                reject(new Error('AI输出解析失败'));
            }
        });

        claudeProcess.stdin.write(aiPrompt);
        claudeProcess.stdin.end();
    });
}

// 启动服务器
db.initDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`✓ Skill Forge服务器运行在 http://localhost:${PORT}/`);
        console.log(`✓ 数据目录: ${DATA_DIR}`);
    });
}).catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
});
