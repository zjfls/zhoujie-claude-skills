#!/usr/bin/env node

/**
 * AI新闻解读服务器
 * 接收新闻数据，生成AI深度解读页面
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3456;
const OUTPUT_DIR = path.join(__dirname, 'output');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 生成AI解读HTML页面
function generateAnalysisHTML(newsData, analysisContent) {
    return `<!DOCTYPE html>
<html lang=zh-CN>
<head>
    <meta charset=UTF-8>
    <meta name=viewport content=width=device-width, initial-scale=1.0>
    <title>AI深度解读 - ${newsData.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .back-button {
            display: inline-block;
            padding: 10px 20px;
            background: #f3f4f6;
            color: #374151;
            text-decoration: none;
            border-radius: 8px;
            margin-bottom: 30px;
            transition: background 0.3s;
        }
        .back-button:hover { background: #e5e7eb; }
        .news-title {
            font-size: 2em;
            color: #1f2937;
            margin-bottom: 20px;
            line-height: 1.3;
        }
        .news-meta {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
            color: #6b7280;
        }
        .section { margin-bottom: 30px; }
        .section-title {
            font-size: 1.5em;
            color: #667eea;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-content {
            color: #4b5563;
            line-height: 1.8;
            font-size: 1.05em;
        }
        .section-content p { margin-bottom: 15px; }
        .section-content ul { margin-left: 20px; margin-bottom: 15px; }
        .section-content li { margin-bottom: 10px; }
        .highlight-box {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .original-link {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
        }
        .original-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        .original-link a:hover { text-decoration: underline; }
        .ai-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class=container>
        <a href=javascript:history.back() class=back-button>← 返回新闻列表</a>
        <div class=ai-badge>🤖 AI深度解读</div>
        <h1 class=news-title>${newsData.title}</h1>
        <div class=news-meta>
            <span>📰 来源：${newsData.source}</span>
            <span>🕐 发布时间：${newsData.date}</span>
        </div>
        ${analysisContent}
        <div class=original-link>
            <p><strong>查看原文：</strong></p>
            <a href=${newsData.url} target=_blank>${newsData.url}</a>
        </div>
    </div>
</body>
</html>`;
}

// 生成AI解读内容
function generateAnalysis(newsData) {
    const analyses = {
        0: {
            background: 'Meta此次收购Limitless是其在AI硬件领域的重要战略布局。Limitless是一家专注于AI可穿戴设备的初创公司，其产品可能包括智能眼镜、智能手表等设备。这次收购反映了Meta继续投资元宇宙和AR/VR技术的决心。报道中提到美国在AI上的投资超过登月计划，凸显了AI技术在当今时代的战略重要性。',
            keyPoints: [
                'Meta通过收购扩展AI硬件产品线，强化在可穿戴设备领域的竞争力',
                '美国AI投资规模超越历史性的登月计划，显示AI的国家战略地位',
                '可穿戴AI设备可能成为下一代人机交互的主要平台',
                'Meta在元宇宙战略中需要硬件支撑，Limitless的技术将补充这一短板'
            ],
            impact: '短期影响：Meta将整合Limitless的技术和团队，可能加速推出新一代AI可穿戴设备。长期影响：AI可穿戴设备市场竞争加剧，可能出现类似智能手机时代的生态系统之争。对消费者而言，未来可能看到更多智能、实用的可穿戴设备。',
            extension: '相关趋势包括：苹果的Vision Pro、谷歌的AR眼镜项目、以及其他科技巨头在AI硬件领域的布局。建议关注AI芯片技术、边缘计算能力、隐私保护等配套技术的发展。'
        },
        1: {
            background: 'Claude Opus 4.5是Anthropic推出的最新旗舰大语言模型。Anthropic由前OpenAI研究人员创立，一直强调AI安全和可靠性。这次发布的Opus 4.5在工程测试中超越人类表现，标志着AI在复杂技术任务上的能力达到了新高度。',
            keyPoints: [
                'Claude Opus 4.5在工程测试中超越所有人类候选人，展示了AI在技术领域的强大能力',
                '这是继GPT-4、Gemini之后，大语言模型能力的又一次重大提升',
                'Anthropic继续保持在AI安全和可靠性方面的领先地位',
                '该模型可能在代码生成、技术文档理解、系统设计等方面有突出表现'
            ],
            impact: '对软件工程行业的影响巨大：AI辅助编程工具将更加强大，可能改变软件开发流程。对企业而言，采用先进AI工具的企业将获得显著的生产力优势。同时也引发关于AI取代部分技术岗位的讨论。',
            extension: '建议关注：AI编程助手的发展趋势、AI代码审查工具、以及如何在团队中有效整合AI工具。软件工程师需要适应与AI协作的新工作模式，重点发展AI无法替代的创造性和战略性能力。'
        },
        2: {
            background: 'Jared Kaplan是Anthropic的首席科学家，也是AI安全领域的权威专家。他提出的2030年决策点指的是是否允许AI系统通过自我训练来提升能力。自我训练可能带来AI能力的指数级增长，但也存在失控风险。',
            keyPoints: [
                'AI自我训练技术可能在2030年前成为现实，需要人类社会提前做出决策',
                '这涉及AI安全的核心问题：如何在推动技术进步和确保安全之间取得平衡',
                'Anthropic作为AI安全的倡导者，呼吁全球范围内的讨论和监管',
                '这不仅是技术问题，更是涉及人类未来的伦理和哲学问题'
            ],
            impact: '这一警告凸显了AI发展进入关键阶段。如果允许AI自我训练，可能快速实现AGI（通用人工智能），带来巨大机遇，但也存在不可预测的风险。全球需要建立AI治理框架，在创新和安全之间找到平衡点。',
            extension: '相关讨论包括：AI对齐问题、AI治理框架、国际AI安全合作等。建议关注各国政府和国际组织在AI监管方面的动态，以及AI伦理研究的最新进展。'
        },
        3: {
            background: '字节跳动的Doubao（豆包）是其自主研发的大语言模型，与百度的文心一言、阿里的通义千问等并列为中国主要的AI大模型。此次推出的AI语音控制工具，是将大模型能力与语音交互技术结合的典型应用。',
            keyPoints: [
                '字节跳动将AI大模型能力整合到智能手机，拓展应用场景',
                '首发中兴手机是战略合作的开始，未来将推广到更多厂商',
                '中国科技企业在AI应用落地方面展现出强大的执行力',
                '语音交互可能成为AI助手的主要交互方式，改变用户使用手机的习惯'
            ],
            impact: '对中国智能手机市场的影响：AI功能将成为新的差异化竞争点。对字节跳动而言，这是其AI生态布局的重要一步，从软件应用延伸到系统级功能。用户将体验到更智能的语音助手，可能减少对传统触控操作的依赖。',
            extension: '相关趋势：国产AI芯片的发展、端侧AI的兴起、多模态交互技术等。建议关注华为、小米、OPPO等国内手机厂商的AI功能竞争，以及苹果、三星等国际品牌的应对策略。'
        },
        4: {
            background: 'MIT（麻省理工学院）一直是AI和机器人技术研究的前沿机构。这个语音到现实系统结合了多项前沿技术：自然语言处理、3D生成式AI（如3D扩散模型）、以及机器人控制技术。这代表了AI从数字世界走向物理世界的重要一步。',
            keyPoints: [
                '打通了从语音指令到实体物品创造的完整链路，展示AI在物理世界的应用潜力',
                '3D生成AI技术日趋成熟，可以根据描述生成三维模型',
                '机器人组装技术使得AI生成的设计能够变成现实',
                '这项技术可能在个性化制造、快速原型设计等领域有广泛应用'
            ],
            impact: '对制造业的潜在影响巨大：可能实现真正的按需制造，消费者可以通过简单的语音描述定制产品。对设计行业而言，AI辅助设计工具将更加智能和高效。长期来看，可能改变制造业的组织形式，从大规模生产转向分布式、个性化生产。',
            extension: '相关技术包括：3D打印、生成式设计、协作机器人等。建议关注工业4.0、智能制造、以及AI在供应链优化中的应用。'
        },
        5: {
            background: '联合国开发计划署（UNDP）一直关注全球发展不平等问题。这份名为《下一次大分化》的报告警告，AI技术可能成为加剧全球不平等的新因素。发达国家在AI研发、基础设施、人才储备等方面占据优势，可能进一步拉大与发展中国家的差距。',
            keyPoints: [
                'AI技术的发展可能扩大数字鸿沟，发达国家和发展中国家的差距加大',
                'AI需要大量计算资源、数据和人才，这些资源在全球分布不均',
                '发展中国家可能在AI时代面临被边缘化的风险',
                '国际社会需要采取行动，确保AI技术的公平发展和普惠应用'
            ],
            impact: '这一警告提醒我们，技术进步不会自动带来平等。如果不加干预，AI可能加剧经济、教育、就业等多个领域的全球不平等。发展中国家需要加大AI投资，国际组织应推动技术转让和能力建设。同时，AI伦理和治理框架应考虑全球公平性。',
            extension: '相关议题：数字基础设施建设、开源AI模型的重要性、国际AI合作机制、AI教育和人才培养的全球化等。建议关注一带一路数字经济合作、联合国AI治理倡议等国际合作项目。'
        },
        6: {
            background: '2025年12月是AI领域的活跃月份，多个领域同时取得突破。医疗AI在疾病诊断、药物研发方面的进展；多语言模型打破语言障碍；AI代理技术走向成熟，能够自主完成复杂任务；同时，AI伦理和监管问题也受到更多关注。',
            keyPoints: [
                '医疗AI的突破可能改善全球医疗服务的可及性和质量',
                '多语言生成模型促进跨文化交流，减少语言障碍',
                'AI代理技术的成熟意味着AI可以更自主地完成任务，减少人工干预',
                'AI伦理和监管的重视表明行业正朝着负责任的方向发展'
            ],
            impact: '多领域的同步突破显示AI技术进入加速发展期。医疗AI可能缓解医疗资源不足问题；多语言模型促进全球化合作；AI代理技术将提高各行业的自动化水平。但同时，伦理和监管问题也更加紧迫，需要建立健全的治理框架。',
            extension: '建议关注：具体的医疗AI应用案例、多语言模型在国际商务和教育中的应用、AI代理的安全性和可控性研究、以及欧盟AI法案、美国AI行政令等监管政策的实施情况。'
        }
    };

    const analysis = analyses[newsData.id] || {
        background: '背景信息分析中...',
        keyPoints: ['关键要点分析中...'],
        impact: '影响评估分析中...',
        extension: '相关延伸分析中...'
    };

    return `
        <div class=section>
            <h2 class=section-title>📚 背景分析</h2>
            <div class=section-content>
                <p>${analysis.background}</p>
            </div>
        </div>
        <div class=section>
            <h2 class=section-title>🎯 关键要点</h2>
            <div class=section-content>
                <ul>${analysis.keyPoints.map(point => `<li>${point}</li>`).join('')}</ul>
            </div>
        </div>
        <div class=section>
            <h2 class=section-title>💡 影响评估</h2>
            <div class=section-content>
                <div class=highlight-box>${analysis.impact}</div>
            </div>
        </div>
        <div class=section>
            <h2 class=section-title>🔗 相关延伸</h2>
            <div class=section-content>
                <p>${analysis.extension}</p>
            </div>
        </div>
    `;
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/analyze') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const newsData = JSON.parse(body);
                console.log('收到AI解读请求:', newsData.title);

                const analysisContent = generateAnalysis(newsData);
                const html = generateAnalysisHTML(newsData, analysisContent);

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const filename = `ai_analysis_${newsData.id}_${timestamp}.html`;
                const filepath = path.join(OUTPUT_DIR, filename);

                fs.writeFileSync(filepath, html, 'utf8');
                console.log('AI解读页面已生成:', filename);

                const absolutePath = path.resolve(filepath);
                let command;
                if (process.platform === 'win32') {
                    command = `start  ${absolutePath}`;
                } else if (process.platform === 'darwin') {
                    command = `open ${absolutePath}`;
                } else {
                    command = `xdg-open ${absolutePath}`;
                }

                exec(command, (error) => {
                    if (error) console.error('打开浏览器失败:', error);
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    analysisUrl: filepath,
                    message: 'AI解读已生成'
                }));
            } catch (error) {
                console.error('处理请求失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 AI新闻解读服务器已启动`);
    console.log(`📡 监听端口: ${PORT}`);
    console.log(`📁 输出目录: ${OUTPUT_DIR}`);
    console.log(`\n等待AI解读请求...\n`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ 端口 ${PORT} 已被占用`);
        console.log(`💡 提示: 服务器可能已在运行，或者尝试使用其他端口\n`);
    } else {
        console.error('服务器错误:', error);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n\n👋 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭\n');
        process.exit(0);
    });
});
