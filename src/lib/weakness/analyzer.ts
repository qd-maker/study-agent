import { callAI } from '@/lib/ai/provider'
import { WEAKNESS_ANALYSIS_PROMPT, GENERATE_TEST_PROMPT, PATIENT_TEACHER_PROMPT } from '@/lib/ai/prompts'
import type { AIConfig, KnowledgePoint, TestQuestion, TestResult } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// 健壮的 JSON 提取函数
function extractJSON(text: string): object | null {
    // 策略 1：尝试匹配 JSON 代码块 (```json ... ```)
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1].trim())
        } catch { /* continue */ }
    }

    // 策略 2：尝试匹配最外层的 { ... }
    const braceMatch = text.match(/\{[\s\S]*\}/)
    if (braceMatch) {
        try {
            return JSON.parse(braceMatch[0])
        } catch { /* continue */ }
    }

    // 策略 3：尝试清理常见问题后重新解析
    if (braceMatch) {
        try {
            // 清理尾随逗号和其他常见问题
            let cleaned = braceMatch[0]
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
                .replace(/[\x00-\x1F\x7F]/g, ' ') // 移除控制字符
            return JSON.parse(cleaned)
        } catch { /* continue */ }
    }

    return null
}

interface AnalyzeParams {
    examId: string
    subject: string
    results: TestResult[]
    questions: TestQuestion[]
    aiConfig: AIConfig
}

// 扩展的薄弱点，包含讲解
export interface WeakPointWithExplanation {
    name: string
    reason: string
    suggestedMasteryLevel: number
    importance: 1 | 2 | 3 | 4 | 5
    explanation: string  // 用直白的话解释
}

interface AnalysisResult {
    weakPoints: WeakPointWithExplanation[]
    summary: string
}

// 返回包含讲解的薄弱点
export async function analyzeWeakness(params: AnalyzeParams): Promise<(KnowledgePoint & { explanation?: string })[]> {
    const { examId, subject, results, questions, aiConfig } = params

    // 构建分析输入，标记"不会"的题目
    const testData = results.map(r => {
        const question = questions.find(q => q.id === r.questionId)
        const isSkipped = r.userAnswer === '不会'
        return {
            question: question?.question,
            userAnswer: r.userAnswer,
            correctAnswer: question?.answer,
            isCorrect: isSkipped ? false : r.isCorrect,
            isSkipped,  // 标记是否跳过
            knowledgePoint: question?.knowledgePointId
        }
    })

    const skippedCount = testData.filter(t => t.isSkipped).length
    const correctRate = results.filter(r => r.isCorrect && r.userAnswer !== '不会').length / results.length

    const input = {
        subject,
        testResults: testData,
        correctRate,
        skippedCount,
        note: skippedCount > 0 ? `用户有 ${skippedCount} 道题选择了"不会"，这些知识点需要从零开始讲解` : ''
    }

    // 使用耐心教师角色进行分析
    const systemPrompt = `${PATIENT_TEACHER_PROMPT}

${WEAKNESS_ANALYSIS_PROMPT}`

    const prompt = `请分析以下测试结果中的薄弱知识点：

${JSON.stringify(input, null, 2)}

请按照系统prompt中的格式要求输出JSON。
特别注意：对于每个薄弱点，请用最直白的话解释这个知识点是什么，举一个生活中的具体例子，让零基础的学生也能听懂。`

    const response = await callAI(aiConfig, prompt, systemPrompt)

    let result: AnalysisResult
    try {
        const parsed = extractJSON(response)
        if (!parsed) {
            console.error('Failed to extract JSON from AI response:', response.substring(0, 500))
            throw new Error('AI 响应中未找到有效 JSON')
        }
        result = parsed as AnalysisResult

        // 验证必要字段存在
        if (!result.weakPoints || !Array.isArray(result.weakPoints)) {
            console.error('Invalid response structure, missing weakPoints:', JSON.stringify(parsed).substring(0, 500))
            // 尝试从其他可能的字段名提取
            const possibleFields = ['weak_points', 'weakpoints', 'points', 'knowledgePoints', 'knowledge_points']
            for (const field of possibleFields) {
                if ((parsed as Record<string, unknown>)[field] && Array.isArray((parsed as Record<string, unknown>)[field])) {
                    result.weakPoints = (parsed as Record<string, unknown>)[field] as AnalysisResult['weakPoints']
                    break
                }
            }
            if (!result.weakPoints) {
                throw new Error('响应格式不正确，缺少 weakPoints 字段')
            }
        }
    } catch (e) {
        console.error('Failed to parse AI response:', response.substring(0, 500))
        throw new Error('AI 响应解析失败，请重试')
    }

    // 转换为 KnowledgePoint 格式，带上讲解
    return result.weakPoints.map(wp => ({
        id: uuidv4(),
        examId,
        name: wp.name || '未命名知识点',
        masteryLevel: wp.suggestedMasteryLevel ?? (wp as unknown as { masteryLevel?: number }).masteryLevel ?? 30,
        importance: (wp.importance ?? 3) as 1 | 2 | 3 | 4 | 5,
        explanation: wp.explanation || wp.reason || ''
    }))
}

interface GenerateTestParams {
    examId: string
    subject: string
    knowledgePoints?: string[]
    count: number
    type?: 'choice' | 'truefalse' | 'short' | 'mixed'
    aiConfig: AIConfig
}

interface GeneratedQuestion {
    question: string
    type: 'choice' | 'truefalse' | 'short'
    options?: string[]
    answer: string
    knowledgePointName: string
    explanation: string
}

interface GenerateResult {
    questions: GeneratedQuestion[]
}

export async function generateTestQuestions(params: GenerateTestParams): Promise<TestQuestion[]> {
    const { examId, subject, knowledgePoints, count, type = 'mixed', aiConfig } = params

    const input = {
        subject,
        knowledgePoints: knowledgePoints || [],
        count,
        typePreference: type,
        note: '请从最基础的概念开始出题，让零基础的学生也能理解题意'
    }

    const prompt = `请为以下学科生成测试题：

${JSON.stringify(input, null, 2)}

请按照系统prompt中的格式要求输出JSON。
注意：选择题只给4个选项，系统会自动添加"不会"选项。`

    const response = await callAI(aiConfig, prompt, GENERATE_TEST_PROMPT)

    let result: GenerateResult
    try {
        const parsed = extractJSON(response)
        if (!parsed) {
            console.error('Failed to extract JSON from AI response:', response.substring(0, 500))
            throw new Error('AI 响应中未找到有效 JSON')
        }
        result = parsed as GenerateResult
    } catch (e) {
        console.error('Failed to parse AI response:', response.substring(0, 500))
        throw new Error('AI 响应解析失败，请重试')
    }

    return result.questions.map(q => ({
        id: uuidv4(),
        examId,
        question: q.question,
        type: q.type,
        options: q.options,
        answer: q.answer
    }))
}
