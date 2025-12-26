'use client'

import { useState } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, CheckCircle2, Clock, ArrowRight, Sparkles, RotateCcw } from 'lucide-react'
import { getReviewLabel, REVIEW_INTERVALS } from '@/lib/review/review'
import Link from 'next/link'

export default function ReviewPage() {
    const { reviewRecords, knowledgePoints, exams, completeReview, getReviewsDueToday } = useAppStore()
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

    const dueReviews = getReviewsDueToday()
    const allPendingReviews = reviewRecords.filter(r => r.status === 'pending')

    const handleComplete = (id: string) => {
        completeReview(id)
        setCompletedIds(prev => new Set([...prev, id]))
    }

    const getPointName = (knowledgePointId: string) => {
        return knowledgePoints.find(k => k.id === knowledgePointId)?.name || '未知知识点'
    }

    const getExamName = (examId: string) => {
        return exams.find(e => e.id === examId)?.name || '未知考试'
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    复习计划
                </h1>
                <p className="text-muted-foreground mt-1">基于艾宾浩斯遗忘曲线的科学复习</p>
            </div>

            {/* 复习间隔说明 */}
            <Card className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-200 dark:border-violet-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-violet-500" />
                        艾宾浩斯遗忘曲线
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {REVIEW_INTERVALS.map((days, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                                第{i + 1}次: {days}天后
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 今日待复习 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        今日待复习
                        {dueReviews.length > 0 && (
                            <Badge className="bg-amber-500">{dueReviews.length}</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>这些知识点需要今天复习以巩固记忆</CardDescription>
                </CardHeader>
                <CardContent>
                    {dueReviews.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                            <p className="text-lg font-medium">今日复习已完成！</p>
                            <p className="text-sm">继续保持，科学复习助你长期记忆</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dueReviews.map(review => {
                                const isJustCompleted = completedIds.has(review.id)
                                return (
                                    <div
                                        key={review.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isJustCompleted
                                                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                                                : 'bg-card hover:bg-muted/50'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">{getPointName(review.knowledgePointId)}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {getReviewLabel(review.reviewCount)}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{getExamName(review.examId)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/learn?id=${review.knowledgePointId}`}>
                                                <Button variant="outline" size="sm" className="gap-1">
                                                    <Sparkles className="h-3 w-3" />
                                                    学习
                                                </Button>
                                            </Link>
                                            <Button
                                                size="sm"
                                                onClick={() => handleComplete(review.id)}
                                                disabled={isJustCompleted}
                                                className={isJustCompleted ? 'bg-emerald-500' : ''}
                                            >
                                                {isJustCompleted ? (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                                        已完成
                                                    </>
                                                ) : (
                                                    '标记完成'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 所有待复习 */}
            {allPendingReviews.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5" />
                            复习队列
                            <Badge variant="secondary">{allPendingReviews.length}</Badge>
                        </CardTitle>
                        <CardDescription>所有待完成的复习任务</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {allPendingReviews
                                .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
                                .slice(0, 10)
                                .map(review => (
                                    <div
                                        key={review.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                                {review.reviewCount + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">{getPointName(review.knowledgePointId)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    下次复习: {review.nextReviewDate}
                                                </p>
                                            </div>
                                        </div>
                                        <Progress
                                            value={(review.reviewCount / 6) * 100}
                                            className="w-20 h-2"
                                        />
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 空状态 */}
            {reviewRecords.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">暂无复习任务</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            在学习页面完成知识点学习后，系统会自动安排复习计划
                        </p>
                        <Link href="/weakness">
                            <Button className="gap-2">
                                去学习
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
