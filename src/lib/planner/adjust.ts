import { callAI } from '@/lib/ai/provider'
import { PLAN_ADJUST_PROMPT } from '@/lib/ai/prompts'
import type { AIConfig, Exam, StudyTask } from '@/types'
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

interface AdjustParams {
    exam: Exam
    tasks: StudyTask[]
    dailyStudyMinutes: number
    aiConfig: AIConfig
    reason: string
}

interface AdjustedTask {
    id?: string
    title: string
    description: string
    estimatedMinutes: number
    scheduledDate: string
    action: 'keep' | 'modify' | 'delete' | 'new'
}

interface AdjustResult {
    adjustedTasks: AdjustedTask[]
    adjustmentReason: string
}

export async function adjustPlan(params: AdjustParams): Promise<StudyTask[]> {
    const { exam, tasks, dailyStudyMinutes, aiConfig, reason } = params

    const examDate = new Date(exam.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 0) {
        return tasks
    }

    const input = {
        examName: exam.name,
        examDate: exam.date,
        daysRemaining,
        dailyStudyMinutes,
        reason,
        tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            scheduledDate: t.scheduledDate,
            estimatedMinutes: t.estimatedMinutes,
            actualMinutes: t.actualMinutes
        }))
    }

    const prompt = `请根据以下情况调整学习计划：

${JSON.stringify(input, null, 2)}

请按照系统prompt中的格式要求输出JSON。`

    const response = await callAI(aiConfig, prompt, PLAN_ADJUST_PROMPT)

    let result: AdjustResult
    try {
        const parsed = extractJSON(response)
        if (!parsed) {
            console.error('Failed to extract JSON:', response.substring(0, 500))
            throw new Error('AI 响应中未找到有效 JSON')
        }
        result = parsed as AdjustResult
    } catch (e) {
        console.error('Failed to parse AI response:', response.substring(0, 500))
        throw new Error('AI 响应解析失败，请重试')
    }

    // 构建任务映射
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const adjustedTasks: StudyTask[] = []

    for (const adjusted of result.adjustedTasks) {
        if (adjusted.action === 'delete') {
            continue
        }

        if (adjusted.action === 'keep' && adjusted.id) {
            const original = taskMap.get(adjusted.id)
            if (original) {
                adjustedTasks.push(original)
            }
        } else if (adjusted.action === 'modify' && adjusted.id) {
            const original = taskMap.get(adjusted.id)
            if (original) {
                adjustedTasks.push({
                    ...original,
                    title: adjusted.title,
                    description: adjusted.description,
                    estimatedMinutes: adjusted.estimatedMinutes,
                    scheduledDate: adjusted.scheduledDate
                })
            }
        } else if (adjusted.action === 'new') {
            adjustedTasks.push({
                id: uuidv4(),
                examId: exam.id,
                title: adjusted.title,
                description: adjusted.description,
                estimatedMinutes: adjusted.estimatedMinutes,
                scheduledDate: adjusted.scheduledDate,
                status: 'pending'
            })
        }
    }

    return adjustedTasks
}

// 快速调整（不需要 AI，基于规则）
export function quickAdjust(tasks: StudyTask[], dailyStudyMinutes: number): StudyTask[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // 找出所有未完成且日期已过的任务
    const overdueTasks = tasks.filter(t =>
        t.status === 'pending' && t.scheduledDate < todayStr
    )

    if (overdueTasks.length === 0) {
        return tasks
    }

    // 重新分配到今天及以后
    const adjustedTasks = [...tasks]
    let currentDate = new Date(today)
    let remainingMinutesToday = dailyStudyMinutes

    // 计算今天已安排的任务时间
    const todayTasks = tasks.filter(t => t.scheduledDate === todayStr && t.status !== 'completed')
    remainingMinutesToday -= todayTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)

    for (const task of overdueTasks) {
        if (remainingMinutesToday < task.estimatedMinutes) {
            currentDate.setDate(currentDate.getDate() + 1)
            remainingMinutesToday = dailyStudyMinutes
        }

        const taskIndex = adjustedTasks.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
            adjustedTasks[taskIndex] = {
                ...task,
                scheduledDate: currentDate.toISOString().split('T')[0]
            }
        }

        remainingMinutesToday -= task.estimatedMinutes
    }

    return adjustedTasks
}
