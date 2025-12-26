import { callAI } from '@/lib/ai/provider'
import { TASK_DECOMPOSE_PROMPT } from '@/lib/ai/prompts'
import type { AIConfig, Exam, KnowledgePoint, StudyTask } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// 健壮的 JSON 提取函数
function extractJSON(text: string): object | null {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
        try { return JSON.parse(codeBlockMatch[1].trim()) } catch { }
    }
    const braceMatch = text.match(/\{[\s\S]*\}/)
    if (braceMatch) {
        try { return JSON.parse(braceMatch[0]) } catch { }
        try {
            return JSON.parse(braceMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'))
        } catch { }
    }
    return null
}

interface DecomposeParams {
    exam: Exam
    knowledgePoints: KnowledgePoint[]
    dailyStudyMinutes: number
    aiConfig: AIConfig
}

interface GeneratedTask {
    title: string
    description: string
    knowledgePointName: string
    estimatedMinutes: number
    scheduledDate: string
    priority: 'high' | 'medium' | 'low'
}

interface DecomposeResult {
    tasks: GeneratedTask[]
    strategy: string
}

export async function decomposeTasks(params: DecomposeParams): Promise<StudyTask[]> {
    const { exam, knowledgePoints, dailyStudyMinutes, aiConfig } = params

    // 计算距离考试的天数
    const examDate = new Date(exam.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExam <= 0) {
        throw new Error('考试日期已过或就在今天，无法生成学习计划')
    }

    // 构建 AI 输入
    const input = {
        examName: exam.name,
        examDate: exam.date,
        daysUntilExam,
        dailyStudyMinutes,
        knowledgePoints: knowledgePoints.map(kp => ({
            name: kp.name,
            masteryLevel: kp.masteryLevel,
            importance: kp.importance
        }))
    }

    const prompt = `请为以下考试制定学习计划：

${JSON.stringify(input, null, 2)}

请按照系统prompt中的格式要求输出JSON。`

    const response = await callAI(aiConfig, prompt, TASK_DECOMPOSE_PROMPT)

    // 解析 AI 响应
    let result: DecomposeResult
    try {
        const parsed = extractJSON(response)
        if (!parsed) {
            console.error('Failed to extract JSON:', response.substring(0, 500))
            throw new Error('AI 响应中未找到有效 JSON')
        }
        result = parsed as DecomposeResult
    } catch (e) {
        console.error('Failed to parse AI response:', response.substring(0, 500))
        throw new Error('AI 响应解析失败，请重试')
    }

    // 将生成的任务转换为 StudyTask 格式
    const kpNameToId = new Map(knowledgePoints.map(kp => [kp.name, kp.id]))

    const tasks: StudyTask[] = result.tasks.map(task => ({
        id: uuidv4(),
        examId: exam.id,
        title: task.title,
        description: task.description,
        knowledgePointId: kpNameToId.get(task.knowledgePointName),
        estimatedMinutes: task.estimatedMinutes,
        scheduledDate: task.scheduledDate,
        status: 'pending' as const
    }))

    return tasks
}

// 快速拆解（不需要 AI，基于规则）
export function quickDecompose(params: Omit<DecomposeParams, 'aiConfig'>): StudyTask[] {
    const { exam, knowledgePoints, dailyStudyMinutes } = params

    const examDate = new Date(exam.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExam <= 0) {
        return []
    }

    // 按优先级排序：重要性 × (100 - 掌握程度)
    const sortedPoints = [...knowledgePoints].sort((a, b) => {
        const scoreA = a.importance * (100 - a.masteryLevel)
        const scoreB = b.importance * (100 - b.masteryLevel)
        return scoreB - scoreA
    })

    const tasks: StudyTask[] = []
    let currentDate = new Date(today)
    let remainingMinutesToday = dailyStudyMinutes

    for (const kp of sortedPoints) {
        // 根据掌握程度估算学习时间
        const baseTime = 30 // 基础学习时间30分钟
        const estimatedMinutes = Math.round(baseTime * (1 + (100 - kp.masteryLevel) / 100))

        // 检查当天剩余时间
        if (remainingMinutesToday < estimatedMinutes) {
            currentDate.setDate(currentDate.getDate() + 1)
            remainingMinutesToday = dailyStudyMinutes

            // 检查是否超过考试日期
            if (currentDate >= examDate) {
                break
            }
        }

        tasks.push({
            id: uuidv4(),
            examId: exam.id,
            title: `学习: ${kp.name}`,
            description: `深入学习和理解 ${kp.name} 相关内容`,
            knowledgePointId: kp.id,
            estimatedMinutes,
            scheduledDate: currentDate.toISOString().split('T')[0],
            status: 'pending'
        })

        remainingMinutesToday -= estimatedMinutes
    }

    return tasks
}
