const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const { db, DATA_DIR, QUIZZES_DIR, HISTORY_DIR } = require('./database');
const { generateResultHTML } = require('./result-template');
const { generateHistoryHTML } = require('./history-template');

const PORT = 3457;
const AI_TIMEOUT = 120000; // 120秒超时

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

        const claudeProcess = spawn('claude', [
            '--print',
            '--model', 'claude-sonnet-4-20250514'
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

        const claudeProcess = spawn('claude', [
            '--print',
            '--model', 'claude-sonnet-4-20250514'
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
