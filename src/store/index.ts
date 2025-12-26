import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Exam, KnowledgePoint, StudyTask, StudyPlan, UserSettings, AIConfig, ReviewRecord } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { calculateNextReviewDate, isReviewCompleted } from '@/lib/review/review'

interface AppState {
    // 考试管理
    exams: Exam[]
    addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => string
    updateExam: (id: string, exam: Partial<Exam>) => void
    deleteExam: (id: string) => void

    // 知识点管理
    knowledgePoints: KnowledgePoint[]
    addKnowledgePoint: (point: Omit<KnowledgePoint, 'id'>) => string
    updateKnowledgePoint: (id: string, point: Partial<KnowledgePoint>) => void
    deleteKnowledgePoint: (id: string) => void
    getKnowledgePointsByExam: (examId: string) => KnowledgePoint[]

    // 学习任务管理
    tasks: StudyTask[]
    addTask: (task: Omit<StudyTask, 'id'>) => string
    updateTask: (id: string, task: Partial<StudyTask>) => void
    deleteTask: (id: string) => void
    getTasksByExam: (examId: string) => StudyTask[]
    getTasksByDate: (date: string) => StudyTask[]

    // 学习计划
    plans: StudyPlan[]
    addPlan: (plan: Omit<StudyPlan, 'id' | 'createdAt' | 'lastAdjustedAt'>) => string
    updatePlan: (id: string, plan: Partial<StudyPlan>) => void

    // 复习记录（艾宾浩斯遗忘曲线）
    reviewRecords: ReviewRecord[]
    createReviewRecord: (knowledgePointId: string, examId: string) => string
    completeReview: (id: string) => void
    getReviewsDueToday: () => ReviewRecord[]
    getReviewsByKnowledgePoint: (knowledgePointId: string) => ReviewRecord | undefined

    // 用户设置
    settings: UserSettings
    updateSettings: (settings: Partial<UserSettings>) => void
    setAIConfig: (config: AIConfig | null) => void
}

const defaultSettings: UserSettings = {
    aiConfig: null,
    dailyStudyMinutes: 120,
    preferredStudyTime: 'any'
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // 考试
            exams: [],
            addExam: (exam) => {
                const id = uuidv4()
                set((state) => ({
                    exams: [...state.exams, { ...exam, id, createdAt: new Date().toISOString() }]
                }))
                return id
            },
            updateExam: (id, exam) => {
                set((state) => ({
                    exams: state.exams.map((e) => (e.id === id ? { ...e, ...exam } : e))
                }))
            },
            deleteExam: (id) => {
                set((state) => ({
                    exams: state.exams.filter((e) => e.id !== id),
                    knowledgePoints: state.knowledgePoints.filter((k) => k.examId !== id),
                    tasks: state.tasks.filter((t) => t.examId !== id),
                    plans: state.plans.filter((p) => p.examId !== id)
                }))
            },

            // 知识点
            knowledgePoints: [],
            addKnowledgePoint: (point) => {
                const id = uuidv4()
                set((state) => ({
                    knowledgePoints: [...state.knowledgePoints, { ...point, id }]
                }))
                return id
            },
            updateKnowledgePoint: (id, point) => {
                set((state) => ({
                    knowledgePoints: state.knowledgePoints.map((k) =>
                        k.id === id ? { ...k, ...point } : k
                    )
                }))
            },
            deleteKnowledgePoint: (id) => {
                set((state) => ({
                    knowledgePoints: state.knowledgePoints.filter((k) => k.id !== id)
                }))
            },
            getKnowledgePointsByExam: (examId) => {
                return get().knowledgePoints.filter((k) => k.examId === examId)
            },

            // 任务
            tasks: [],
            addTask: (task) => {
                const id = uuidv4()
                set((state) => ({
                    tasks: [...state.tasks, { ...task, id }]
                }))
                return id
            },
            updateTask: (id, task) => {
                set((state) => ({
                    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...task } : t))
                }))
            },
            deleteTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== id)
                }))
            },
            getTasksByExam: (examId) => {
                return get().tasks.filter((t) => t.examId === examId)
            },
            getTasksByDate: (date) => {
                return get().tasks.filter((t) => t.scheduledDate.startsWith(date))
            },

            // 计划
            plans: [],
            addPlan: (plan) => {
                const id = uuidv4()
                const now = new Date().toISOString()
                set((state) => ({
                    plans: [...state.plans, { ...plan, id, createdAt: now, lastAdjustedAt: now }]
                }))
                return id
            },
            updatePlan: (id, plan) => {
                set((state) => ({
                    plans: state.plans.map((p) =>
                        p.id === id ? { ...p, ...plan, lastAdjustedAt: new Date().toISOString() } : p
                    )
                }))
            },

            // 复习记录
            reviewRecords: [],
            createReviewRecord: (knowledgePointId, examId) => {
                // 检查是否已存在未完成的复习记录
                const existing = get().reviewRecords.find(
                    r => r.knowledgePointId === knowledgePointId && r.status === 'pending'
                )
                if (existing) return existing.id

                const id = uuidv4()
                const now = new Date()
                set((state) => ({
                    reviewRecords: [...state.reviewRecords, {
                        id,
                        knowledgePointId,
                        examId,
                        reviewCount: 0,
                        lastReviewDate: null,
                        nextReviewDate: calculateNextReviewDate(0, now),
                        status: 'pending',
                        createdAt: now.toISOString()
                    }]
                }))
                return id
            },
            completeReview: (id) => {
                set((state) => ({
                    reviewRecords: state.reviewRecords.map((r) => {
                        if (r.id !== id) return r
                        const newCount = r.reviewCount + 1
                        const today = new Date().toISOString().split('T')[0]
                        if (isReviewCompleted(newCount)) {
                            return { ...r, reviewCount: newCount, lastReviewDate: today, status: 'completed' as const }
                        }
                        return {
                            ...r,
                            reviewCount: newCount,
                            lastReviewDate: today,
                            nextReviewDate: calculateNextReviewDate(newCount)
                        }
                    })
                }))
            },
            getReviewsDueToday: () => {
                const today = new Date().toISOString().split('T')[0]
                return get().reviewRecords.filter(r => r.status === 'pending' && r.nextReviewDate <= today)
            },
            getReviewsByKnowledgePoint: (knowledgePointId) => {
                return get().reviewRecords.find(r => r.knowledgePointId === knowledgePointId)
            },

            // 设置
            settings: defaultSettings,
            updateSettings: (settings) => {
                set((state) => ({
                    settings: { ...state.settings, ...settings }
                }))
            },
            setAIConfig: (config) => {
                set((state) => ({
                    settings: { ...state.settings, aiConfig: config }
                }))
            }
        }),
        {
            name: 'study-planner-storage'
        }
    )
)
