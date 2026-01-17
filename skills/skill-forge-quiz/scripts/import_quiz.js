const fs = require('fs');
const path = require('path');
const DBWriter = require('../lib/db-writer');

// 帮助信息
if (process.argv.includes('--help') || process.argv.length < 3) {
  console.log(`
Usage: node scripts/import_quiz.js <path_to_quiz_json>

Description:
  Imports a quiz from a JSON file into the Skill Forge database.

JSON File Format:
  {
    "topic": "Subject Topic",
    "topic_detail": "Detailed description (optional)",
    "difficulty": "beginner|intermediate|advanced",
    "questions": [
      {
        "content": "Question text",
        "type": "choice|essay|code",
        "options": ["A", "B", "C", "D"], // Required for choice type
        "correct_answer": "Correct Answer",
        "explanation": "Detailed explanation",
        "knowledge_points": ["Point1", "Point2"],
        "score": 10
      }
    ]
  }

Example:
  node scripts/import_quiz.js ./my_quiz.json
    `);
  process.exit(0);
}

const filePath = process.argv[2];
const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Error: File not found at ${absolutePath}`);
  process.exit(1);
}

async function importQuiz() {
  try {
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const quizData = JSON.parse(fileContent);

    // 验证必要字段
    if (!quizData.topic || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Invalid JSON format: Missing "topic" or "questions" array.');
    }

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
    console.log(`   Run 'npm start' and visit http://localhost:3457/quiz/${quizId} to take the quiz.`);

    // 关闭连接 (Database 类可能没有显式的 close 等待 Promise，这里简单退出)
    // db.close(); // 同步关闭

  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

importQuiz();
