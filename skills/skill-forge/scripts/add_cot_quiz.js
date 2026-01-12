const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(process.env.HOME, '.skill-forge/skill-forge.db');
const db = new sqlite3.Database(DB_PATH);

const QUIZ_ID = `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}_cot-react-theory`;
const TOPIC = 'CoT与ReAct原理深度解析';
const DIFFICULTY = 'intermediate';
const CREATED_AT = new Date().toISOString();

const questions = [
    // === Chain of Thought (CoT) ===
    {
        content: '在 Jason Wei 等人提出的 "Chain-of-Thought Prompting" 论文中，CoT 的核心思想是什么？',
        options: ['A. 通过增加模型参数量来提高推理能力', 'B. 提供一系列中间推理步骤作为提示的一部分', 'C. 使用强化学习对模型进行微调', 'D. 将所有问题转化为二分类问题'],
        correct: 'B',
        explanation: 'CoT 的核心是通过在提示中展示"中间推理步骤"（intermediate reasoning steps），引导大模型在生成最终答案前先进行逐步推理。'
    },
    {
        content: 'Zero-shot CoT (Kojima et al.) 发现，只需在提示中添加哪句咒语，就能大幅提升 LLM 的推理能力？',
        options: ['A. Let\'s think step by step', 'B. Answer correctly', 'C. Explain your reasoning', 'D. Ignore previous instructions'],
        correct: 'A',
        explanation: 'Kojima 等人在 "Large Language Models are Zero-Shot Reasoners" 中发现，只需添加 "Let\'s think step by step" 即可激活模型的零样本推理能力。'
    },
    {
        content: '传统的 Prompting 方法（如 Few-shot）主要依赖什么来指导模型？',
        options: ['A. 推理链条', 'B. 问答对的输入输出样例', 'C. 模型的内部状态', 'D. 外部知识库'],
        correct: 'B',
        explanation: '传统的 Few-shot prompting (Standard Prompting) 通常只给出 <Input, Output> 的样例，而不包含中间的推理过程。'
    },
    {
        content: '相比于标准提示，CoT 在哪类任务上带来的性能提升最为显著？',
        options: ['A. 情感分析', 'B. 机器翻译', 'C. 算术推理、常识推理和符号推理', 'D. 文本摘要'],
        correct: 'C',
        explanation: 'CoT 尤其擅长解决需要多步逻辑推理的任务，如数学应用题（GSM8K）、常识推理（CommonsenseQA）和符号操作任务。'
    },
    {
        content: 'CoT 方法的一个主要前提是模型必须达到一定的什么标准才能涌现出推理能力？',
        options: ['A. 至少 1000 亿参数 (100B+)', 'B. 必须要经过 RLHF', 'C. 必须是开源模型', 'D. 必须支持多模态'],
        correct: 'A',
        explanation: 'Wei 等人的研究指出，CoT 能力通常在模型达到一定规模（如 100B 参数以上）时才会作为"涌现能力"（Emergent Ability）显现出来。'
    },
    {
        content: 'Manual-CoT (手动编写 CoT) 和 Zero-shot CoT 的主要区别在于？',
        options: ['A. 使用的模型不同', 'B. 是否在提示中提供人工编写的推理样例', 'C. 推理结果的准确性', 'D. 适用的任务类型'],
        correct: 'B',
        explanation: 'Manual-CoT 属于 Few-shot CoT，需要在 Prompt 中提供包含推理步骤的示例；而 Zero-shot CoT 不需要示例，仅靠指令触发。'
    },
    {
        content: '以下哪项不是 CoT 的潜在缺点？',
        options: ['A. 增加了输入的 Token 消耗', 'B. 推理过程可能产生幻觉 (Hallucination)', 'C. 降低了模型的可解释性', 'D. 增加了推理的计算延迟'],
        correct: 'C',
        explanation: 'CoT 实际上**提高**了可解释性，因为它展示了模型的思考路径。缺点包括增加了 Token 消耗、延迟以及推理链中可能包含错误逻辑（幻觉）。'
    },
    {
        content: 'Self-Consistency (自洽性) 策略是如何改进 CoT 的？',
        options: ['A. 通过人工修正错误的推理步骤', 'B. 采样多条推理路径，通过"多数投票"决定最终答案', 'C. 强制模型只输出一个确定的答案', 'D. 减少提示的长度'],
        correct: 'B',
        explanation: 'Self-Consistency (Wang et al.) 通过采样多个不同的推理路径（Reasoning Paths），然后通过多数投票（Majority Vote）来聚合答案，从而提高准确率。'
    },
    {
        content: '关于 Least-to-Most Prompting，它的工作原理是？',
        options: ['A. 从最简单的问题开始，逐步解决更复杂的问题', 'B. 从数据量最少的数据集开始训练', 'C. 优先输出概率最低的词', 'D. 不需要任何提示'],
        correct: 'A',
        explanation: 'Least-to-Most Prompting (Zhou et al.) 将复杂问题分解为子问题（Decomposition），先解决简单的子问题，再利用子问题的答案来解决原问题。'
    },
    {
        content: 'Auto-CoT (Zhang et al.) 的主要贡献是？',
        options: ['A. 完全取代了人工编写 Prompts', 'B. 自动构建带有推理链的样例以消除手工编写的负担', 'C. 自动评估 CoT 的质量', 'D. 自动训练大模型'],
        correct: 'B',
        explanation: 'Auto-CoT 提出了一种自动构造 CoT 演示样例的方法：先用 Zero-shot ("Let\'s think step by step") 生成推理链，然后筛选多样化的问题构建 Few-shot 样例。'
    },

    // === ReAct (Reasoning + Acting) ===
    {
        content: 'ReAct (Yao et al.) 论文全称中的核心关键词是？',
        options: ['A. Reasoning and Acting', 'B. Reading and Acting', 'C. Reacting and Thinking', 'D. Reasoning and Asking'],
        correct: 'A',
        explanation: 'ReAct: Synergizing **Reasoning** and **Acting** in Language Models.'
    },
    {
        content: 'ReAct 框架解决了纯 CoT 方法的什么局限性？',
        options: ['A. 计算速度慢', 'B. 无法与外部世界交互获取新信息', 'C. 只能处理英文', 'D. 上下文长度限制'],
        correct: 'B',
        explanation: 'CoT 仅依赖模型内部参数知识，容易产生幻觉或知识过时。ReAct 允许模型执行动作（如搜索、查询数据库），从而获取外部信息来支持推理。'
    },
    {
        content: '在 ReAct 中，模型生成的输出通常交替包含哪两类内容？',
        options: ['A. 问题和答案', 'B. 输入和输出', 'C. Thoughts (思考) 和 Actions (动作)', 'D. SQL 和 Python'],
        correct: 'C',
        explanation: 'ReAct 的循环通常是：Thought (推理当前状态) -> Action (执行动作) -> Observation (观察结果) -> Thought... 如此循环。'
    },
    {
        content: '相比于纯 Action 方法（如 WebGPT 早期策略），ReAct 加入 Reasoning 的好处是？',
        options: ['A. 减少 Token 消耗', 'B. 能够处理高维图像', 'C. 使模型在执行动作前能够规划和调整策略，并处理异常', 'D. 提高动作执行速度'],
        correct: 'C',
        explanation: '通过显式的 Reasoning (Thought traces)，模型可以规划下一步行动、跟踪任务进度，并在观察结果不符合预期时动态调整计划。'
    },
    {
        content: 'ReAct 论文中经常使用的两个基准任务（Benchmark）是？',
        options: ['A. ImageNet 和 CIFAR-10', 'B. HotpotQA 和 Fever', 'C. GLUE 和 SuperGLUE', 'D. SQuAD 和 MNIST'],
        correct: 'B',
        explanation: 'ReAct 主要在多跳问答 (HotpotQA) 和事实验证 (Fever) 任务上进行了评估，这些任务需要检索外部知识。'
    },
    {
        content: 'ReAct 的 "Action" 空间通常不包括以下哪种？',
        options: ['A. Search[query]', 'B. Lookup[keyword]', 'C. Finish[answer]', 'D. UpdateWeights[params]'],
        correct: 'D',
        explanation: 'ReAct 的动作通常是API调用（搜索、查找、结束任务等），而不是修改模型自身的权重参数。'
    },
    {
        content: 'ReAct 提示（Prompt）的设计通常包含哪些部分的 Few-shot 样例？',
        options: ['A. 仅包含最终答案', 'B. 包含 Thought-Action-Observation 的完整轨迹', 'C. 仅包含 Python 代码', 'D. 仅包含问题描述'],
        correct: 'B',
        explanation: 'ReAct 的 Prompt 会提供展示了完整交互轨迹（思考-动作-观察）的样例，以教会模型遵循这种格式。'
    },
    {
        content: '在 ReAct 的 HotpotQA 实验中，"Observation" 来源于？',
        options: ['A. 模型的想象', 'B. 搜索引擎或维基百科 API 的返回结果', 'C. 用户输入', 'D. 随机生成'],
        correct: 'B',
        explanation: '模型执行 Search 或 Lookup 动作后，环境（Environment）会返回 API 的结果作为 Observation。'
    },
    {
        content: '以下关于 ReAct 和 CoT 以及 Act-only 的对比，哪项是 ReAct 论文的结论？',
        options: ['A. ReAct 在所有任务上都比 CoT 差', 'B. ReAct 只有在微调后才有效', 'C. ReAct 结合了 CoT 的推理能力和 Act 的知行能力，减少了幻觉并提高了可解释性', 'D. Act-only 方法比 ReAct 更准确'],
        correct: 'C',
        explanation: 'ReAct 的优势在于协同（Synergy）：推理指导行动，行动充实推理上下文。'
    },
    {
        content: 'ReAct 也可以应用在决策制定（Decision Making）任务中，例如？',
        options: ['A. AlfaLink', 'B. ALFWorld (基于文本的游戏)', 'C. Protein Folding', 'D. Stock Prediction'],
        correct: 'B',
        explanation: '论文展示了 ReAct 在 ALFWorld（基于文本的家庭环境模拟游戏）中的应用，展示了其解决交互式任务的能力。'
    },

    // === 进阶与对比 ===
    {
        content: 'MRKL (Modular Reasoning, Knowledge and Language) 系统与 ReAct 的主要相似点是？',
        options: ['A. 都使用了神经网络', 'B. 都强调调用外部工具/模块来增强模型能力', 'C. 都是由 Google 提出的', 'D. 都只支持数学运算'],
        correct: 'B',
        explanation: 'MRKL (Karpas et al.) 和 ReAct 都属于 "Augmented LLM" 范畴，通过调用外部工具（如计算器、数据库）来弥补 LLM 的短板。'
    },
    {
        content: 'Toolformer (Schick et al.) 与 ReAct 在工具使用上的主要区别是？',
        options: ['A. Toolformer 是通过自监督学习在预训练/微调阶段学会调用 API，而不是仅靠提示', 'B. Toolformer 不支持 API', 'C. Toolformer 只能做加法', 'D. ReAct 需要微调'],
        correct: 'A',
        explanation: 'ReAct 通常是基于冻结的 LLM 通过提示工程实现的，而 Toolformer 是通过微调模型，使其学会自发地生成 API 调用 token。'
    },
    {
        content: '在 ReAct 过程中，如果模型陷入"循环"（一直重复相同的搜索），通常如何解决？',
        options: ['A. 停止任务', 'B. 限制最大步数，或在提示中加入避免重复的指导', 'C. 重启服务器', 'D. 增加随机温度'],
        correct: 'B',
        explanation: '在实际应用（如 LangChain 里的 ReAct Agent）中，通常会设置 max_iterations 或在 Prompt 中包含"如果搜不到结果请尝试其他关键词"的指导。'
    },
    {
        content: 'Tot (Tree of Thoughts) 对 CoT 做了什么扩展？',
        options: ['A. 将线性推理扩展为树状搜索，允许回溯和探索不同分支', 'B. 把它变成了图神经网络', 'C. 删除了所有推理步骤', 'D. 只保留了叶子节点'],
        correct: 'A',
        explanation: 'Tree of Thoughts (Yao et al.) 允许模型在推理过程中探索多种可能的路径（树的分支），并进行自我评估和回溯。'
    },
    {
        content: 'Reflexion (Shinn et al.) 框架在 ReAct 的基础上增加了什么机制？',
        options: ['A. 语音识别', 'B. 自我反思 (Self-Reflection) 和语言反馈', 'C. 图像生成', 'D. 更多的参数'],
        correct: 'B',
        explanation: 'Reflexion 允许 Agent 在任务失败后，通过语言反馈进行"反思"，将失败经验记录到长短期记忆中，以便在下一次尝试时改进。'
    },
    {
        content: '为什么 ReAct 往往比纯 CoT 更能减少"事实幻觉"？',
        options: ['A. ReAct 模型更大', 'B. ReAct 根本不生成文本', 'C. ReAct 将推理建立在检索到的真实外部信息之上', 'D. ReAct 过滤了所有名词'],
        correct: 'C',
        explanation: 'CoT 容易编造事实（因为依赖内部记忆），ReAct 通过 "Look up" 动作获取真实信息（Grounding），推理基于这些观察，因此更可靠。'
    },
    {
        content: '在 LangChain 等框架中，ReAct Agent 通常对应哪种 Agent 类型？',
        options: ['A. Zero-shot React Description', 'B. VectorStore Agent', 'C. Pandas Agent', 'D. SQL Agent'],
        correct: 'A',
        explanation: 'LangChain 中经典的 `ZERO_SHOT_REACT_DESCRIPTION` Agent 就是基于 ReAct 论文实现的，它根据工具描述选择工具并执行 ReAct 循环。'
    },
    {
        content: 'CoT-SC (Self-Consistency) 的主要计算代价在于？',
        options: ['A. 需要训练新模型', 'B. 推理时需要对同一个 Query 进行多次采样 (Inference)', 'C. 需要巨大的显存', 'D. 需要人工标注'],
        correct: 'B',
        explanation: 'Self-Consistency 需要对同一个输入运行多次（例如 5-10 次）推理生成不同路径，因此推理成本是标准 CoT 的数倍。'
    },
    {
        content: '"Plan-and-Solve" Prompting 策略主要针对 Zero-shot CoT 的什么问题？',
        options: ['A. 计算错误', 'B. 推理步骤缺失或逻辑跳跃', 'C. 英语不好', 'D. 速度太慢'],
        correct: 'B',
        explanation: 'Plan-and-Solve (Wang et al.) 提议先让模型生成一个明确的"计划"，然后执行计划，以解决 Zero-shot CoT 有时逻辑混乱的问题。'
    },
    {
        content: 'ReAct 的 Thought-Action 循环何时终止？',
        options: ['A. 当 Observation 为空时', 'B. 当模型输出 "Finish[...]" 动作时', 'C. 当达到 100 步时', 'D. 当用户关闭浏览器时'],
        correct: 'B',
        explanation: '模型如果认为已经收集到足够信息并得出了结论，会生成一个 Finish 动作（及最终答案），从而结束循环。'
    }
];

// 数据库操作函数
function insertQuiz() {
    db.serialize(() => {
        // 1. 插入试卷
        const stmt = db.prepare(`
            INSERT INTO quizzes (quiz_id, topic, topic_detail, difficulty, question_count, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(QUIZ_ID, TOPIC, '深入理解 Chain-of-Thought, Zero-shot CoT, ReAct 及其衍生技术 (ToT, Reflexion)', DIFFICULTY, questions.length, CREATED_AT, 'created', function (err) {
            if (err) {
                console.error('Quiz insertion failed:', err.message);
                return;
            }
            console.log(`Quiz inserted successfully. ID: ${QUIZ_ID}`);
            insertQuestions(QUIZ_ID);
        });
        stmt.finalize();
    });
}

function insertQuestions(quizId) {
    const stmt = db.prepare(`
        INSERT INTO questions (
            quiz_id, question_number, question_type, content, 
            options, correct_answer, score, knowledge_points, explanation, source_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let completed = 0;
    db.parallelize(() => {
        questions.forEach((q, index) => {
            stmt.run(
                quizId,
                index + 1,
                'choice',
                q.content,
                JSON.stringify(q.options),
                q.correct,
                Math.round(100 / questions.length), // 均分分数
                JSON.stringify(['LLM', 'Prompt Engineering', 'Reasoning']), // 默认知识点
                q.explanation,
                'manual',
                function (err) {
                    if (err) console.error(`Question ${index + 1} failed:`, err.message);
                    else {
                        completed++;
                        if (completed === questions.length) {
                            console.log(`All ${completed} questions inserted.`);
                            db.close();
                        }
                    }
                }
            );
        });
    });
    stmt.finalize();
}

// 执行
insertQuiz();
