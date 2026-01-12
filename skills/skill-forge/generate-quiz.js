const { db, QUIZZES_DIR } = require('./lib/database');
const { generateQuizHTML } = require('./lib/html-template');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// 配置
const TOPIC = 'C++基础';
const TOPIC_DETAIL = '指针、引用、类与对象等基础知识';
const DIFFICULTY = 'beginner';
const QUESTION_COUNT = 10;

// 生成quiz_id
function generateQuizId(topic) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const topicSlug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[+]/g, 'plus').substring(0, 30);
    return `${timestamp}_${topicSlug}`;
}

// C++基础面试题（基于网络搜索结果）
const questions = [
    // 题目1：指针与引用的区别
    {
        question_number: 1,
        question_type: 'choice',
        content: '关于C++中指针和引用的区别，以下说法错误的是：',
        options: [
            '指针是一个变量，存储的是内存地址；引用是变量的别名',
            '引用在定义时必须初始化，指针可以先定义后赋值',
            '可以有多级指针，也可以有多级引用',
            '指针使用时需要解引用(*)，引用使用时无需解引用'
        ],
        correct_answer: 'C',
        score: 10,
        knowledge_points: ['指针', '引用', '基础语法'],
        explanation: '在C++中，只能有一级引用，不能有多级引用（如int&&是错误的语法，右值引用除外）。但可以有多级指针，如int**、int***等。',
        source_type: 'interview',
        source_name: 'w3cschool',
        source_url: 'https://www.w3cschool.cn/cpp/cpp-a9no2ppi.html'
    },

    // 题目2：const修饰指针
    {
        question_number: 2,
        question_type: 'choice',
        content: '以下关于const修饰指针的说法，正确的是：',
        options: [
            'const int *p 表示指针p不能被修改',
            'int * const p 表示指针p指向的内容不能被修改',
            'const int * const p 表示指针p和指向的内容都不能被修改',
            '以上说法都不正确'
        ],
        correct_answer: 'C',
        score: 10,
        knowledge_points: ['const关键字', '指针', '常量'],
        explanation: 'const int *p（常量指针）：指向的内容不能改，指针本身可以改；int * const p（指针常量）：指针不能改，指向的内容可以改；const int * const p：两者都不能改。',
        source_type: 'interview',
        source_name: '编程指北',
        source_url: 'https://csguide.cn/cpp/intro.html'
    },

    // 题目3：类的构造函数
    {
        question_number: 3,
        question_type: 'choice',
        content: '关于C++类的构造函数，以下说法错误的是：',
        options: [
            '构造函数的函数名必须与类名相同',
            '构造函数可以有返回值',
            '一个类可以有多个构造函数（重载）',
            '如果没有定义构造函数，编译器会自动生成默认构造函数'
        ],
        correct_answer: 'B',
        score: 10,
        knowledge_points: ['类', '构造函数', '面向对象'],
        explanation: '构造函数不能有返回值（包括void），这是构造函数的基本特性。构造函数在对象创建时自动调用，用于初始化对象。',
        source_type: 'interview',
        source_name: 'CSDN博客',
        source_url: 'https://blog.csdn.net/BostonRayAlen/article/details/93041395'
    },

    // 题目4：结构体与共同体
    {
        question_number: 4,
        question_type: 'choice',
        content: '关于C++中struct（结构体）和union（共同体）的区别，以下说法正确的是：',
        options: [
            'struct中所有成员共享同一块内存空间',
            'union中每个成员都有独立的内存空间',
            'union的大小等于其最大成员的大小',
            'struct和union没有本质区别'
        ],
        correct_answer: 'C',
        score: 10,
        knowledge_points: ['结构体', '共同体', '内存管理'],
        explanation: 'struct的每个成员有独立内存空间，大小是所有成员大小之和（考虑内存对齐）；union的所有成员共享同一块内存空间，大小等于最大成员的大小。',
        source_type: 'interview',
        source_name: '博客园',
        source_url: 'https://www.cnblogs.com/LUO77/p/5771237.html'
    },

    // 题目5：new和malloc的区别
    {
        question_number: 5,
        question_type: 'essay',
        content: '请简述C++中new和malloc的区别（至少列举3点）。',
        correct_answer: `主要区别包括：
1. new是C++运算符，malloc是C库函数
2. new会自动调用构造函数，malloc不会
3. new返回具体类型指针，malloc返回void*指针需要强制转换
4. new失败抛出bad_alloc异常，malloc失败返回NULL
5. new无需指定内存大小（自动计算），malloc需要显式指定字节数
6. delete会自动调用析构函数，free不会`,
        score: 10,
        knowledge_points: ['new运算符', 'malloc函数', '内存管理', '构造函数'],
        explanation: '这是C++面试中的经典问题，考查对C++内存管理机制的理解。new/delete是C++特有的，提供了类型安全和自动构造/析构功能。',
        source_type: 'interview',
        source_name: '牛客网',
        source_url: 'https://www.nowcoder.com/discuss/454697528508870656'
    },

    // 题目6：值传递、指针传递、引用传递
    {
        question_number: 6,
        question_type: 'choice',
        content: '以下哪种函数参数传递方式，在函数体内修改参数值会影响到函数外部的变量？',
        options: [
            '值传递：void func(int a)',
            '指针传递：void func(int *a)',
            '引用传递：void func(int &a)',
            'B和C都可以'
        ],
        correct_answer: 'D',
        score: 10,
        knowledge_points: ['函数参数', '传递方式', '指针', '引用'],
        explanation: '值传递在函数内操作的是副本，不影响原变量；指针传递和引用传递在函数内操作的是原变量本身，会影响外部变量。',
        source_type: 'interview',
        source_name: '小林coding',
        source_url: 'https://xiaolincoding.com/interview/cpp.html'
    },

    // 题目7：sizeof运算符
    {
        question_number: 7,
        question_type: 'choice',
        content: '在32位系统中，以下代码的输出结果是多少？\n\nint a = 10;\nint *p = &a;\ncout << sizeof(p) << endl;',
        options: [
            '4（字节）',
            '8（字节）',
            '10',
            '编译错误'
        ],
        correct_answer: 'A',
        score: 10,
        knowledge_points: ['sizeof运算符', '指针', '数据类型'],
        explanation: '在32位系统中，指针的大小固定为4字节；在64位系统中为8字节。sizeof(p)计算的是指针变量本身的大小，而不是指向内容的大小。',
        source_type: 'interview',
        source_name: 'CSDN博客',
        source_url: 'https://blog.csdn.net/qq_52896916/article/details/134093407'
    },

    // 题目8：虚函数基础
    {
        question_number: 8,
        question_type: 'choice',
        content: '关于C++中的虚函数（virtual function），以下说法错误的是：',
        options: [
            '虚函数通过在函数声明前加virtual关键字来定义',
            '虚函数用于实现多态性',
            '构造函数可以是虚函数',
            '析构函数可以是虚函数'
        ],
        correct_answer: 'C',
        score: 10,
        knowledge_points: ['虚函数', '多态', '构造函数', '析构函数'],
        explanation: '构造函数不能是虚函数。因为虚函数依赖于虚函数表指针（vptr），而vptr是在构造函数执行时初始化的。析构函数可以且经常应该是虚函数（基类析构函数通常声明为virtual）。',
        source_type: 'interview',
        source_name: '阿里云开发者社区',
        source_url: 'https://developer.aliyun.com/article/709155'
    },

    // 题目9：内存分区
    {
        question_number: 9,
        question_type: 'essay',
        content: 'C++程序的内存分为哪几个区域？请简要说明每个区域存储的内容。',
        correct_answer: `C++程序内存主要分为以下区域：
1. 栈区（Stack）：存储局部变量、函数参数、返回地址等，由系统自动分配和释放
2. 堆区（Heap）：存储动态分配的内存（new/malloc），由程序员手动分配和释放
3. 全局/静态区（Global/Static）：存储全局变量和静态变量，程序结束时释放
4. 常量区（Const）：存储字符串常量和const修饰的全局变量，不可修改
5. 代码区（Code）：存储程序的机器码指令，只读`,
        score: 10,
        knowledge_points: ['内存分区', '栈', '堆', '内存管理'],
        explanation: '理解内存分区对于编写高效、安全的C++程序至关重要。不同区域有不同的生命周期和访问权限。',
        source_type: 'interview',
        source_name: '编程指北',
        source_url: 'https://csguide.cn/cpp/'
    },

    // 题目10：数组与指针
    {
        question_number: 10,
        question_type: 'choice',
        content: '以下代码的输出结果是：\n\nint arr[5] = {1, 2, 3, 4, 5};\nint *p = arr;\ncout << *(p+2) << endl;',
        options: [
            '1',
            '2',
            '3',
            '编译错误'
        ],
        correct_answer: 'C',
        score: 10,
        knowledge_points: ['数组', '指针', '指针运算'],
        explanation: '数组名arr是数组首元素的地址，p指向arr[0]，p+2指向arr[2]，*(p+2)的值是3。指针加n表示指向前进n个元素（而不是n个字节）。',
        source_type: 'interview',
        source_name: '菜鸟教程',
        source_url: 'https://www.runoob.com/cplusplus/cpp-pointers.html'
    }
];

async function main() {
    try {
        console.log('='.repeat(60));
        console.log('Skill Forge - C++基础测验生成器');
        console.log('='.repeat(60));

        // 1. 初始化数据库
        console.log('\n[1/7] 初始化数据库...');
        await db.initDatabase();

        // 2. 生成quiz_id
        const quiz_id = generateQuizId(TOPIC);
        console.log(`✓ 生成quiz_id: ${quiz_id}`);

        // 3. 创建试卷记录
        console.log('\n[2/7] 创建试卷记录...');
        await db.createQuiz({
            quiz_id,
            topic: TOPIC,
            topic_detail: TOPIC_DETAIL,
            difficulty: DIFFICULTY,
            question_count: QUESTION_COUNT
        });
        console.log('✓ 试卷记录已创建');

        // 4. 插入题目
        console.log('\n[3/7] 插入题目到数据库...');
        await db.insertQuestions(quiz_id, questions);
        console.log(`✓ 已插入 ${questions.length} 道题目`);

        // 5. 生成HTML文件
        console.log('\n[4/7] 生成HTML试卷文件...');
        const quiz = await db.getQuiz(quiz_id);
        const questionsData = await db.getQuestions(quiz_id);
        const html = generateQuizHTML(quiz, questionsData);

        const quizDir = path.join(QUIZZES_DIR, quiz_id);
        if (!fs.existsSync(quizDir)) {
            fs.mkdirSync(quizDir, { recursive: true });
        }

        const htmlPath = path.join(quizDir, 'quiz.html');
        fs.writeFileSync(htmlPath, html, 'utf8');
        console.log(`✓ HTML文件已生成: ${htmlPath}`);

        // 6. 启动服务器
        console.log('\n[5/7] 启动HTTP服务器...');
        const serverPath = path.join(__dirname, 'lib', 'server.js');

        // 先检查端口是否被占用，如果是则杀死旧进程
        if (process.platform === 'win32') {
            try {
                const { execSync } = require('child_process');
                execSync('netstat -ano | findstr :3457 | findstr LISTENING', { encoding: 'utf8', stdio: 'pipe' });
                console.log('  检测到端口3457被占用，正在重启服务器...');
                execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq Skill Forge Server*"', { stdio: 'ignore' });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                // 端口未被占用或杀死进程失败，继续
            }
        }

        const serverProcess = spawn('node', [serverPath], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false
        });

        serverProcess.unref();
        console.log('✓ 服务器启动成功 (PID:', serverProcess.pid, ')');

        // 等待服务器完全启动
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 7. 打开浏览器
        console.log('\n[6/7] 打开浏览器...');
        const url = `http://localhost:3457/quizzes/${quiz_id}/quiz.html`;

        let openCmd;
        if (process.platform === 'win32') {
            openCmd = `start "" "${url}"`;
        } else if (process.platform === 'darwin') {
            openCmd = `open "${url}"`;
        } else {
            openCmd = `xdg-open "${url}"`;
        }

        const { exec } = require('child_process');
        exec(openCmd, (error) => {
            if (error) {
                console.error('  ⚠️ 自动打开浏览器失败，请手动访问:', url);
            } else {
                console.log('✓ 浏览器已打开');
            }
        });

        // 8. 完成
        console.log('\n[7/7] ✅ 测验准备完成！');
        console.log('='.repeat(60));
        console.log('\n📚 测验信息:');
        console.log(`   主题: ${TOPIC}`);
        console.log(`   难度: ${DIFFICULTY === 'beginner' ? '初级' : DIFFICULTY}`);
        console.log(`   题目数量: ${QUESTION_COUNT}`);
        console.log(`   总分: ${questions.reduce((sum, q) => sum + q.score, 0)}分`);
        console.log(`\n🌐 访问地址: ${url}`);
        console.log(`📁 数据目录: ${QUIZZES_DIR}`);
        console.log('\n💡 提示:');
        console.log('   - 每道题都可以点击"💬 向AI提问"获取帮助');
        console.log('   - 答题会自动保存，刷新页面不会丢失');
        console.log('   - 提交后可以查看详细的成绩分析');
        console.log('   - 访问 http://localhost:3457/dashboard 查看所有测验');
        console.log('\n祝你测验顺利！🎓');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ 生成测验失败:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// 运行主函数
main();
