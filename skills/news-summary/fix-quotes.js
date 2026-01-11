const fs = require('fs');

// 读取文件
const content = fs.readFileSync('ai-analysis-server.js', 'utf8');

// 替换所有中文引号为空（删除强调用的引号）
let fixed = content;
fixed = fixed.replace(/"/g, '');  // 删除左中文双引号
fixed = fixed.replace(/"/g, '');  // 删除右中文双引号
fixed = fixed.replace(/'/g, "'");  // 替换左中文单引号
fixed = fixed.replace(/'/g, "'");  // 替换右中文单引号

// 写回文件
fs.writeFileSync('ai-analysis-server.js', fixed, 'utf8');

console.log('修复完成！已删除所有中文引号。');
