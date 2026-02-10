const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { spawn } = require('child_process');
const DBWriter = require('../lib/db-writer');

function parseArgs(argv) {
  const fix = argv.includes('--fix');
  const file = argv.find((a) => a && !a.startsWith('--'));
  return { fix, file };
}

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/import_quiz.js [--fix] <path_to_quiz_json>

Description:
  Imports a quiz from a JSON file into the Skill Forge database.
  If the Skill Forge Dashboard server is not running, it will be started automatically.

Options:
  --fix   Apply safe normalizations (e.g. strip "A./B." prefixes from options).
`);
  process.exit(0);
}

function readSkillForgePortFromConfig() {
  const configPath = path.join(os.homedir(), '.skill-forge', 'config.json');
  try {
    if (!fs.existsSync(configPath)) return 3457;
    const raw = fs.readFileSync(configPath, 'utf8');
    const cfg = JSON.parse(raw);
    const port = cfg?.server?.port;
    return typeof port === 'number' && Number.isFinite(port) ? port : 3457;
  } catch {
    return 3457;
  }
}

function isPortOpen(port, host = '127.0.0.1', timeoutMs = 250) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function waitForPort(port, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function startSkillForgeServerInBackground(logPath) {
  const serverJs = path.resolve(__dirname, '../../skill-forge-base/lib/server.js');
  const serverCwd = path.resolve(__dirname, '../../skill-forge-base');

  if (!fs.existsSync(serverJs)) {
    throw new Error(`Skill Forge server entry not found: ${serverJs}`);
  }

  const logFd = fs.openSync(logPath, 'a');
  const child = spawn(process.execPath, [serverJs], {
    cwd: serverCwd,
    detached: true,
    stdio: ['ignore', logFd, logFd]
  });
  child.unref();
  return child.pid;
}

async function ensureSkillForgeServerRunning() {
  const port = readSkillForgePortFromConfig();

  if (await isPortOpen(port)) return port;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(os.tmpdir(), `skill-forge-server.${timestamp}.log`);

  console.log(`ℹ️ Skill Forge Dashboard 未运行，尝试启动（port=${port}）...`);
  try {
    startSkillForgeServerInBackground(logPath);
  } catch (err) {
    throw new Error(`启动 Skill Forge 失败：${err.message}`);
  }

  const ok = await waitForPort(port, 10000);
  if (!ok) {
    throw new Error(
      `Skill Forge 启动超时（port=${port}）。请检查日志：${logPath}\n` +
        `也可以手动运行：node ${path.resolve(__dirname, '../../skill-forge-base/lib/server.js')}`
    );
  }

  console.log(`✅ Skill Forge Dashboard 已启动：http://localhost:${port}/dashboard`);
  return port;
}

function stripMathSegments(text) {
  if (typeof text !== 'string' || !text) return '';
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$]*?\$/g, '')
    .replace(/\\\\\([\s\S]*?\\\\\)/g, '')
    .replace(/\\\\\[[\s\S]*?\\\\\]/g, '');
}

function findSuspiciousMathOutsideDelimiters(text) {
  const outside = stripMathSegments(text);
  if (!outside) return [];

  const patterns = [
    /\\(lim|frac|sum|int|sqrt|prod|max|min)\b/,
    /\blim_\{[^}]*\}/i,
    /[a-zA-Z]+\^\{[^}]+\}/,
    /[a-zA-Z]+_\{[^}]+\}/
  ];

  const hits = [];
  for (const re of patterns) {
    const m = outside.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

function stripChoiceLabelPrefix(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/^\s*[A-Ha-h][\.\)、\)]\s+/, '');
}

function validateAndNormalizeQuizData(quizData, { fix }) {
  const errors = [];
  const normalized = { ...quizData };
  const optionPrefixRe = /^\s*[A-Ha-h][\.\)、\)]\s+/;

  if (Array.isArray(quizData.questions)) {
    normalized.questions = quizData.questions.map((q, idx) => {
      const qn = idx + 1;
      const question = { ...q };

      const fieldsToCheck = [
        ['content', question.content],
        ['correct_answer', question.correct_answer],
        ['explanation', question.explanation]
      ];

      if (Array.isArray(question.options)) {
        const prefixed = question.options
          .map((opt, i) => ({ opt, i }))
          .filter(({ opt }) => typeof opt === 'string' && optionPrefixRe.test(opt));
        if (prefixed.length > 0) {
          if (fix) {
            question.options = question.options.map((opt) => stripChoiceLabelPrefix(opt));
          } else {
            errors.push(
              `Q${qn}.options: 检测到手写的 A./B. 前缀（会导致页面重复显示），请删除前缀或使用 --fix`
            );
          }
        }
        fieldsToCheck.push(...question.options.map((opt, i) => [`options[${i}]`, opt]));
      }

      for (const [field, value] of fieldsToCheck) {
        if (typeof value !== 'string') continue;
        const hits = findSuspiciousMathOutsideDelimiters(value);
        if (hits.length > 0) {
          errors.push(
            `Q${qn}.${field}: 疑似数学表达式未用 $...$/$$...$$ 包裹（例如: ${hits
              .slice(0, 3)
              .join(', ')}）`
          );
        }
      }

      return question;
    });
  }

  if (errors.length > 0) {
    const guidance =
      `数学公式必须使用 LaTeX 并放在分隔符内，例如：` +
      `"$\\\\lim_{x\\\\to a} f(x) = L$"。\n` +
      `另外，options[] 里不要手写 "A."/ "B." 前缀（页面会自动加）。`;
    throw new Error(`检测到不符合数学公式规范的文本：\n- ${errors.join('\n- ')}\n\n${guidance}`);
  }

  return normalized;
}

// 帮助信息
if (process.argv.includes('--help')) {
  printUsageAndExit();
}

const { fix, file: filePath } = parseArgs(process.argv.slice(2));
if (!filePath) {
  printUsageAndExit();
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Error: File not found at ${absolutePath}`);
  process.exit(1);
}

async function importQuiz() {
  try {
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const quizDataRaw = JSON.parse(fileContent);
    const quizData = validateAndNormalizeQuizData(quizDataRaw, { fix });

    // 验证必要字段
    if (!quizData.topic || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Invalid JSON format: Missing "topic" or "questions" array.');
    }

    // 确保 skill-forge-base 的 Dashboard 服务已启动（它也会负责初始化 DB/schema/config）
    const port = await ensureSkillForgeServerRunning();

    // 初始化数据库连接
    const db = new DBWriter();
    // DBWriter operates on the existing DB file managed by skill-forge-base


    // 1. 生成 Quiz ID 和基本数据
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    let topicSlug = quizData.topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 30);
    // 如果 slug 为空（例如纯中文主题），使用 'quiz' 作为默认值，避免 ID 结尾出现悬空的下划线
    if (!topicSlug) {
      topicSlug = 'quiz';
    }
    const quizId = `${timestamp}_${topicSlug}`;

    const newQuiz = {
      quiz_id: quizId,
      topic: quizData.topic,
      topic_detail: quizData.topic_detail || `Imported from ${path.basename(filePath)}`,
      difficulty: quizData.difficulty || 'intermediate',
      question_count: quizData.questions.length,
      created_at: new Date().toISOString(),
      status: 'created'
    };

    console.log(`Creating quiz: ${newQuiz.topic} (ID: ${quizId})...`);

    // 2. 插入试卷记录
    await db.createQuiz(newQuiz);

    // 3. 处理并插入题目
    const questionsToInsert = quizData.questions.map((q, index) => ({
      quiz_id: quizId,
      question_number: index + 1,
      question_type: q.type || 'choice', // 默认为选择题
      content: q.content,
      options: Array.isArray(q.options) ? JSON.stringify(q.options) : null,
      correct_answer: q.correct_answer,
      score: q.score || Math.round(100 / quizData.questions.length),
      knowledge_points: Array.isArray(q.knowledge_points) ? JSON.stringify(q.knowledge_points) : JSON.stringify([]),
      explanation: q.explanation || '',
      source_type: q.source_type || 'import',
      source_name: q.source_name || path.basename(filePath)
    }));

    await db.insertQuestions(quizId, questionsToInsert);

    console.log(`✅ Successfully imported quiz with ${questionsToInsert.length} questions.`);
    console.log(`   Take the quiz: http://localhost:${port}/quiz/${quizId}`);
    console.log(`   Dashboard:     http://localhost:${port}/dashboard`);

    // 关闭连接 (Database 类可能没有显式的 close 等待 Promise，这里简单退出)
    // db.close(); // 同步关闭

  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

importQuiz();
