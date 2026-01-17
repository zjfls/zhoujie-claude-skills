/**
 * 文本相似度计算工具
 * 用于检测语义相似但措辞不同的题目
 */

/**
 * 计算Jaccard相似度（基于词集合）
 * 适合检测整体内容相似度
 * @param {string} text1 - 文本1
 * @param {string} text2 - 文本2
 * @returns {number} - 相似度 (0-1)
 */
function jaccardSimilarity(text1, text2) {
    // 改进的分词：中文按字符分，英文按单词分
    const tokenize = (text) => {
        const normalized = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fff]/g, ' ');
        const tokens = new Set();

        // 提取中文字符（按字符）
        const chineseChars = normalized.match(/[\u4e00-\u9fff]/g) || [];
        chineseChars.forEach(char => tokens.add(char));

        // 提取英文单词（按单词）
        const englishWords = normalized.match(/[a-z0-9]+/g) || [];
        englishWords.forEach(word => {
            if (word.length > 0) tokens.add(word);
        });

        return tokens;
    };

    const set1 = tokenize(text1);
    const set2 = tokenize(text2);

    // 交集
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    // 并集
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
}

/**
 * 计算余弦相似度（基于词频向量）
 * 更精确，考虑词频
 * @param {string} text1 - 文本1
 * @param {string} text2 - 文本2
 * @returns {number} - 相似度 (0-1)
 */
function cosineSimilarity(text1, text2) {
    // 改进的分词并统计词频
    const getWordFreq = (text) => {
        const normalized = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fff]/g, ' ');
        const freq = {};

        // 提取中文字符（按字符）
        const chineseChars = normalized.match(/[\u4e00-\u9fff]/g) || [];
        chineseChars.forEach(char => {
            freq[char] = (freq[char] || 0) + 1;
        });

        // 提取英文单词（按单词）
        const englishWords = normalized.match(/[a-z0-9]+/g) || [];
        englishWords.forEach(word => {
            if (word.length > 0) {
                freq[word] = (freq[word] || 0) + 1;
            }
        });

        return freq;
    };

    const freq1 = getWordFreq(text1);
    const freq2 = getWordFreq(text2);

    // 获取所有词汇
    const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

    // 计算向量点积和模长
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    allWords.forEach(word => {
        const f1 = freq1[word] || 0;
        const f2 = freq2[word] || 0;

        dotProduct += f1 * f2;
        magnitude1 += f1 * f1;
        magnitude2 += f2 * f2;
    });

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 计算Levenshtein距离（编辑距离）
 * 返回归一化的相似度（0-1）
 * @param {string} text1 - 文本1
 * @param {string} text2 - 文本2
 * @returns {number} - 相似度 (0-1)
 */
function levenshteinSimilarity(text1, text2) {
    const s1 = text1.toLowerCase();
    const s2 = text2.toLowerCase();

    const len1 = s1.length;
    const len2 = s2.length;

    // 动态规划计算编辑距离
    const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,     // 删除
                    dp[i][j - 1] + 1,     // 插入
                    dp[i - 1][j - 1] + 1  // 替换
                );
            }
        }
    }

    const distance = dp[len1][len2];
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    return 1 - (distance / maxLen);
}

/**
 * 综合相似度计算（推荐使用）
 * 结合Jaccard和余弦相似度，返回加权平均值
 * @param {string} text1 - 文本1
 * @param {string} text2 - 文本2
 * @param {Object} weights - 权重配置 {jaccard: 0.4, cosine: 0.6}
 * @returns {number} - 相似度 (0-1)
 */
function combinedSimilarity(text1, text2, weights = { jaccard: 0.4, cosine: 0.6 }) {
    const jaccardScore = jaccardSimilarity(text1, text2);
    const cosineScore = cosineSimilarity(text1, text2);

    return jaccardScore * weights.jaccard + cosineScore * weights.cosine;
}

/**
 * 判断两个题目是否相似
 * @param {Object} question1 - 题目1 {content, options}
 * @param {Object} question2 - 题目2 {content, options}
 * @param {number} threshold - 相似度阈值（默认0.7）
 * @returns {boolean} - 是否相似
 */
function areQuestionsSimilar(question1, question2, threshold = 0.7) {
    // 比较题目内容
    const contentSimilarity = combinedSimilarity(question1.content, question2.content);

    // 如果题目内容相似度超过阈值，认为是相似题目
    if (contentSimilarity >= threshold) {
        return true;
    }

    // 对于选择题，还需要比较选项
    if (question1.options && question2.options) {
        const options1 = Array.isArray(question1.options)
            ? question1.options.join(' ')
            : JSON.stringify(question1.options);
        const options2 = Array.isArray(question2.options)
            ? question2.options.join(' ')
            : JSON.stringify(question2.options);

        const optionsSimilarity = combinedSimilarity(options1, options2);

        // 如果题目内容中等相似(0.5-0.7)，且选项也相似，认为是相似题目
        if (contentSimilarity >= 0.5 && optionsSimilarity >= 0.7) {
            return true;
        }
    }

    return false;
}

/**
 * 从题目列表中找出与目标题目相似的题目
 * @param {Object} targetQuestion - 目标题目
 * @param {Array<Object>} existingQuestions - 已有题目列表
 * @param {number} threshold - 相似度阈值（默认0.7）
 * @returns {Array<Object>} - 相似题目列表 [{question, similarity}]
 */
function findSimilarQuestions(targetQuestion, existingQuestions, threshold = 0.7) {
    const similarQuestions = [];

    for (const existingQ of existingQuestions) {
        const similarity = combinedSimilarity(targetQuestion.content, existingQ.content);

        if (similarity >= threshold) {
            similarQuestions.push({
                question: existingQ,
                similarity: similarity.toFixed(3)
            });
        }
    }

    // 按相似度降序排序
    return similarQuestions.sort((a, b) => b.similarity - a.similarity);
}

module.exports = {
    jaccardSimilarity,
    cosineSimilarity,
    levenshteinSimilarity,
    combinedSimilarity,
    areQuestionsSimilar,
    findSimilarQuestions
};
