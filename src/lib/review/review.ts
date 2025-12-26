// 艾宾浩斯遗忘曲线复习调度
// 复习间隔: 1天 → 2天 → 4天 → 7天 → 15天 → 30天

export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30] // 天数

/**
 * 计算下次复习日期
 * @param reviewCount 当前已完成的复习次数 (0-5)
 * @param fromDate 起始日期，默认为今天
 * @returns ISO 日期字符串
 */
export function calculateNextReviewDate(reviewCount: number, fromDate?: Date): string {
    const base = fromDate || new Date()
    const intervalIndex = Math.min(reviewCount, REVIEW_INTERVALS.length - 1)
    const daysToAdd = REVIEW_INTERVALS[intervalIndex]

    const nextDate = new Date(base)
    nextDate.setDate(nextDate.getDate() + daysToAdd)
    return nextDate.toISOString().split('T')[0]
}

/**
 * 获取复习轮次描述
 */
export function getReviewLabel(reviewCount: number): string {
    const labels = ['首次复习', '第2次复习', '第3次复习', '第4次复习', '第5次复习', '第6次复习', '巩固完成']
    return labels[Math.min(reviewCount, labels.length - 1)]
}

/**
 * 判断知识点是否已完成所有复习轮次
 */
export function isReviewCompleted(reviewCount: number): boolean {
    return reviewCount >= REVIEW_INTERVALS.length
}

/**
 * 获取今日待复习的记录
 */
export function filterDueReviews<T extends { nextReviewDate: string; status: string }>(
    records: T[],
    date?: string
): T[] {
    const today = date || new Date().toISOString().split('T')[0]
    return records.filter(r => r.status === 'pending' && r.nextReviewDate <= today)
}
