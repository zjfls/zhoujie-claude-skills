(function () {
    'use strict';

    // ==================== 全局状态管理 ====================

    const quizState = {
        quizId: '',
        examId: '',              // 新增：当前测验ID
        quiz: null,
        questions: [],
        answers: {},           // { questionNumber: userAnswer }
        currentQuestion: 1,
        startTime: Date.now(),
        aiRequests: new Map()  // { questionNumber: { requestId, status, response } }
    };

    // ==================== 初始化 ====================

    async function init() {
        // 获取quiz_id
        const container = document.getElementById('quiz-container');
        if (!container) {
            console.error('Quiz container not found');
            return;
        }

        quizState.quizId = container.getAttribute('data-quiz-id');
        if (!quizState.quizId) {
            console.error('Quiz ID not found');
            return;
        }

        // 加载试卷数据
        await loadQuizData();

        // 创建或继续测验
        await startOrContinueExam();

        // 尝试从localStorage恢复状态
        restoreState();

        // 绑定事件
        bindEvents();

        // 启动自动保存
        startAutoSave();

        // 显示第一题
        showQuestion(1);
    }

    /**
     * 创建或继续测验
     */
    async function startOrContinueExam() {
        try {
            const response = await fetch('/api/start-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quiz_id: quizState.quizId })
            });
            const data = await response.json();

            quizState.examId = data.exam_id;
            console.log(data.isExisting ? '继续测验:' : '新建测验:', quizState.examId);
        } catch (error) {
            console.error('创建测验失败:', error);
            alert('创建测验失败：' + error.message);
        }
    }

    async function loadQuizData() {
        try {
            const response = await fetch(`/api/quiz?quiz_id=${quizState.quizId}`);
            const data = await response.json();

            quizState.quiz = data.quiz;
            quizState.questions = data.questions;

            console.log('试卷数据加载成功:', quizState.quiz);
        } catch (error) {
            console.error('加载试卷数据失败:', error);
            alert('加载试卷失败：' + error.message);
        }
    }

    function restoreState() {
        const saved = localStorage.getItem(`quiz_${quizState.quizId}_draft`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                quizState.answers = data.answers || {};
                quizState.currentQuestion = data.currentQuestion || 1;
                console.log('已恢复答题进度');
            } catch (err) {
                console.error('恢复状态失败:', err);
            }
        }
    }

    function saveState() {
        const data = {
            answers: quizState.answers,
            currentQuestion: quizState.currentQuestion,
            savedAt: Date.now()
        };
        localStorage.setItem(`quiz_${quizState.quizId}_draft`, JSON.stringify(data));
    }

    function startAutoSave() {
        setInterval(() => {
            saveState();
        }, 30000); // 每30秒自动保存
    }

    // ==================== 事件绑定 ====================

    function bindEvents() {
        // 题目导航
        document.querySelectorAll('.question-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const questionNum = parseInt(e.currentTarget.getAttribute('data-question'));
                showQuestion(questionNum);
            });
        });

        // 上一题/下一题
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (quizState.currentQuestion > 1) {
                    showQuestion(quizState.currentQuestion - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (quizState.currentQuestion < quizState.questions.length) {
                    showQuestion(quizState.currentQuestion + 1);
                }
            });
        }

        // 提交试卷
        const submitBtn = document.getElementById('submit-quiz');
        if (submitBtn) {
            submitBtn.addEventListener('click', handleSubmit);
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'ArrowLeft' || e.key === 'p') {
                    e.preventDefault();
                    if (quizState.currentQuestion > 1) {
                        showQuestion(quizState.currentQuestion - 1);
                    }
                } else if (e.key === 'ArrowRight' || e.key === 'n') {
                    e.preventDefault();
                    if (quizState.currentQuestion < quizState.questions.length) {
                        showQuestion(quizState.currentQuestion + 1);
                    }
                }
            }
        });
    }

    // ==================== 显示题目 ====================

    function showQuestion(questionNumber) {
        quizState.currentQuestion = questionNumber;
        saveState();

        // 隐藏所有题目
        document.querySelectorAll('.question-card').forEach(card => {
            card.style.display = 'none';
        });

        // 显示当前题目
        const currentCard = document.querySelector(`.question-card[data-question="${questionNumber}"]`);
        if (currentCard) {
            currentCard.style.display = 'block';

            // 渲染数学公式
            if (window.renderMathInElement) {
                renderMathInElement(currentCard, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        }

        // 更新导航状态
        document.querySelectorAll('.question-nav-item').forEach(item => {
            item.classList.remove('active');
            const num = parseInt(item.getAttribute('data-question'));
            if (num === questionNumber) {
                item.classList.add('active');
            }
        });

        // 更新进度
        updateProgress();

        // 恢复答案
        restoreAnswer(questionNumber);
    }

    function restoreAnswer(questionNumber) {
        const answer = quizState.answers[questionNumber];
        if (!answer) return;

        const card = document.querySelector(`.question-card[data-question="${questionNumber}"]`);
        if (!card) return;

        const question = quizState.questions.find(q => q.question_number === questionNumber);
        if (!question) return;

        if (question.question_type === 'choice') {
            // 单选题
            const radio = card.querySelector(`input[value="${answer}"]`);
            if (radio) radio.checked = true;
        } else if (question.question_type === 'multiple_choice') {
            // 多选题 - 答案是逗号分隔的字符串如 "A,B,C"
            const selectedOptions = answer.split(',').map(s => s.trim());
            selectedOptions.forEach(opt => {
                const checkbox = card.querySelector(`input[type="checkbox"][value="${opt}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else {
            // 问答题/代码题
            const textarea = card.querySelector('textarea');
            if (textarea) textarea.value = answer;
        }
    }

    function updateProgress() {
        const answered = Object.keys(quizState.answers).length;
        const total = quizState.questions.length;

        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `已答 ${answered}/${total}`;
        }

        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            const percentage = (answered / total) * 100;
            progressBar.style.width = `${percentage}%`;
        }

        // 更新导航项状态
        document.querySelectorAll('.question-nav-item').forEach(item => {
            const num = parseInt(item.getAttribute('data-question'));
            if (quizState.answers[num]) {
                item.classList.add('answered');
            } else {
                item.classList.remove('answered');
            }
        });
    }

    // ==================== 保存答案 ====================

    function saveAnswer(questionNumber, answer) {
        quizState.answers[questionNumber] = answer;
        saveState();
        updateProgress();
    }

    // 为所有答题输入绑定保存事件
    document.addEventListener('DOMContentLoaded', () => {
        // 单选题
        document.querySelectorAll('.question-card input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const card = e.target.closest('.question-card');
                const questionNum = parseInt(card.getAttribute('data-question'));
                saveAnswer(questionNum, e.target.value);
            });
        });

        // 多选题
        document.querySelectorAll('.question-card input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const card = e.target.closest('.question-card');
                const questionNum = parseInt(card.getAttribute('data-question'));
                // 收集所有选中的选项
                const checkedBoxes = card.querySelectorAll('input[type="checkbox"]:checked');
                const selectedValues = Array.from(checkedBoxes).map(cb => cb.value).sort().join(',');
                saveAnswer(questionNum, selectedValues);
            });
        });

        // 问答题/代码题
        document.querySelectorAll('.question-card textarea').forEach(textarea => {
            textarea.addEventListener('input', debounce((e) => {
                const card = e.target.closest('.question-card');
                const questionNum = parseInt(card.getAttribute('data-question'));
                saveAnswer(questionNum, e.target.value);
            }, 500));
        });
    });

    // ==================== AI提问功能 ====================

    async function handleAskAI(questionNumber) {
        const question = quizState.questions.find(q => q.question_number === questionNumber);
        if (!question) return;

        // 显示输入对话框
        const userQuery = await showAIPromptDialog(question);
        if (!userQuery) return; // 用户取消

        // 显示加载模态框
        showLoadingModal('AI正在思考中...');

        try {
            // 发送AI请求
            const response = await fetch('/api/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_id: quizState.examId,
                    quiz_id: quizState.quizId,
                    question_number: questionNumber,
                    user_query: userQuery
                })
            });

            // 检查响应状态
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`服务器错误 (${response.status}): ${text.substring(0, 200)}`);
            }

            const data = await response.json();
            const requestId = data.requestId;

            // 保存requestId到状态
            quizState.aiRequests.set(questionNumber, {
                requestId,
                status: 'processing'
            });

            // 轮询状态
            await pollAIStatus(requestId, questionNumber);

        } catch (error) {
            hideLoadingModal();
            alert('AI请求失败：' + error.message);
        }
    }

    async function pollAIStatus(requestId, questionNumber) {
        const startTime = Date.now();
        const maxWaitTime = 125000; // 125秒（服务器120秒+5秒余量）

        const poll = async () => {
            try {
                const response = await fetch(`/api/ai-status?requestId=${requestId}`);

                // 检查响应状态
                if (!response.ok) {
                    throw new Error(`状态查询失败 (${response.status})`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    // 成功
                    hideLoadingModal();
                    showAIResponse(questionNumber, data.response);

                    quizState.aiRequests.set(questionNumber, {
                        requestId,
                        status: 'success',
                        response: data.response
                    });

                } else if (data.status === 'error') {
                    // 失败
                    hideLoadingModal();
                    alert('AI回答失败：' + data.error);

                    quizState.aiRequests.delete(questionNumber);

                } else if (data.status === 'processing') {
                    // 仍在处理
                    const elapsed = Date.now() - startTime;

                    if (elapsed > maxWaitTime) {
                        // 超时
                        hideLoadingModal();
                        alert('AI请求超时，请稍后重试');
                        quizState.aiRequests.delete(questionNumber);
                    } else {
                        // 继续轮询
                        setTimeout(poll, 2000); // 每2秒查询一次
                    }
                }

            } catch (error) {
                hideLoadingModal();
                alert('查询AI状态失败：' + error.message);
                quizState.aiRequests.delete(questionNumber);
            }
        };

        poll();
    }

    function showAIPromptDialog(question) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.id = 'ai-prompt-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;

            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin: 0 0 20px 0; color: #333;">💬 向AI导师提问</h3>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <strong>题目：</strong>${question.content}
                    </div>
                    <p style="color: #666; margin-bottom: 15px;">请描述你的疑问（AI不会直接给出答案，而是引导你思考）：</p>
                    <textarea id="ai-query-input"
                        placeholder="例如：这道题考查的是什么知识点？\n解题思路是什么？\n我的思路是xxx，对吗？"
                        style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit; resize: vertical;"
                    ></textarea>
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="ai-cancel-btn" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">取消</button>
                        <button id="ai-submit-btn" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 6px; cursor: pointer;">提问</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const textarea = modal.querySelector('#ai-query-input');
            const cancelBtn = modal.querySelector('#ai-cancel-btn');
            const submitBtn = modal.querySelector('#ai-submit-btn');

            cancelBtn.onclick = () => {
                modal.remove();
                resolve(null);
            };

            submitBtn.onclick = () => {
                const query = textarea.value.trim();
                if (!query) {
                    alert('请输入问题');
                    return;
                }
                modal.remove();
                resolve(query);
            };

            // 点击背景关闭
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            };

            // 聚焦输入框
            setTimeout(() => textarea.focus(), 100);
        });
    }

    function showAIResponse(questionNumber, response) {
        const modal = document.createElement('div');
        modal.id = 'ai-response-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #333;">🤖 AI导师的回答</h3>
                    <button id="close-ai-response" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
                </div>
                <div style="line-height: 1.8; color: #333;">
                    ${response}
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button id="close-ai-response-btn" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 6px; cursor: pointer;">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#close-ai-response');
        const closeBtnBottom = modal.querySelector('#close-ai-response-btn');

        closeBtn.onclick = () => modal.remove();
        closeBtnBottom.onclick = () => modal.remove();

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    // ==================== 加载模态框 ====================

    function showLoadingModal(message) {
        const existing = document.getElementById('loading-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'loading-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 90%;">
                <div class="spinner" style="
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <p style="color: #333; font-size: 16px; margin: 0;">${message}</p>
                <p id="elapsed-time" style="color: #667eea; font-size: 14px; margin-top: 10px; font-weight: 600;">已用时：0秒</p>
                <div style="width: 100%; height: 8px; background: #f3f3f3; border-radius: 4px; margin-top: 15px; overflow: hidden;">
                    <div id="progress-bar-ai" style="height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; width: 0%; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(modal);

        // 启动计时器
        const startTime = Date.now();
        const updateInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const timeEl = document.getElementById('elapsed-time');
            const progressBar = document.getElementById('progress-bar-ai');

            if (timeEl) {
                timeEl.textContent = `已用时：${elapsed}秒`;
            }

            if (progressBar) {
                let progress;
                if (elapsed < 5) {
                    progress = elapsed * 6;
                } else if (elapsed < 30) {
                    progress = 30 + (elapsed - 5) * 2;
                } else {
                    progress = 80 + Math.min(15, (elapsed - 30) * 0.5);
                }
                progressBar.style.width = `${Math.min(95, progress)}%`;
            }
        }, 1000);

        modal.dataset.intervalId = updateInterval;
    }

    function hideLoadingModal() {
        const modal = document.getElementById('loading-modal');
        if (modal) {
            const intervalId = modal.dataset.intervalId;
            if (intervalId) {
                clearInterval(Number(intervalId));
            }
            modal.remove();
        }
    }

    // ==================== 提交试卷 ====================

    async function handleSubmit() {
        // 检查是否所有题目都已作答
        const unanswered = [];
        for (let i = 1; i <= quizState.questions.length; i++) {
            if (!quizState.answers[i] || quizState.answers[i].trim() === '') {
                unanswered.push(i);
            }
        }

        if (unanswered.length > 0) {
            const confirmed = confirm(`还有${unanswered.length}道题未作答（题号：${unanswered.join(', ')}）\n\n确定要提交吗？未作答的题目将得0分。`);
            if (!confirmed) return;
        }

        const finalConfirm = confirm('确定要提交试卷吗？提交后将无法修改。');
        if (!finalConfirm) return;

        showLoadingModal('正在评分中，请稍候...');

        try {
            const timeSpent = Math.floor((Date.now() - quizState.startTime) / 1000);

            const response = await fetch('/api/submit-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_id: quizState.examId,
                    quiz_id: quizState.quizId,
                    answers: quizState.answers,
                    time_spent: timeSpent
                })
            });

            const result = await response.json();

            hideLoadingModal();

            // 清除草稿
            localStorage.removeItem(`quiz_${quizState.quizId}_draft`);

            // 跳转到成绩页面（动态路由）
            window.location.href = `/result/${quizState.quizId}?submission_id=${result.submission_id}`;

        } catch (error) {
            hideLoadingModal();
            alert('提交失败：' + error.message);
        }
    }

    // ==================== 工具函数 ====================

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // ==================== 暴露全局接口 ====================

    window.SkillForge = {
        askAI: handleAskAI,
        showQuestion: showQuestion,
        getState: () => quizState
    };

    // ==================== 启动 ====================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
