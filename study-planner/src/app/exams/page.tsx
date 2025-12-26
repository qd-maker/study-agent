'use client'

import { useState } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, Calendar } from 'lucide-react'

export default function ExamsPage() {
    const { exams, addExam, updateExam, deleteExam } = useAppStore()
    const [isOpen, setIsOpen] = useState(false)
    const [editingExam, setEditingExam] = useState<typeof exams[0] | null>(null)

    // 表单状态
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        date: '',
        totalScore: 100
    })

    const resetForm = () => {
        setFormData({ name: '', subject: '', date: '', totalScore: 100 })
        setEditingExam(null)
    }

    const handleSubmit = () => {
        if (!formData.name || !formData.subject || !formData.date) return

        if (editingExam) {
            updateExam(editingExam.id, formData)
        } else {
            addExam(formData)
        }

        resetForm()
        setIsOpen(false)
    }

    const handleEdit = (exam: typeof exams[0]) => {
        setEditingExam(exam)
        setFormData({
            name: exam.name,
            subject: exam.subject,
            date: exam.date.split('T')[0],
            totalScore: exam.totalScore
        })
        setIsOpen(true)
    }

    const handleDelete = (id: string) => {
        if (confirm('确定要删除这个考试吗？相关的知识点和学习任务也会被删除。')) {
            deleteExam(id)
        }
    }

    // 按日期排序
    const sortedExams = [...exams].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        考试管理
                    </h1>
                    <p className="text-muted-foreground mt-1">添加和管理你的考试安排</p>
                </div>

                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600">
                            <Plus className="h-4 w-4" />
                            添加考试
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingExam ? '编辑考试' : '添加新考试'}</DialogTitle>
                            <DialogDescription>
                                填写考试信息，我们将为你生成学习计划
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">考试名称</Label>
                                <Input
                                    id="name"
                                    placeholder="如：高等数学期末考试"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subject">学科</Label>
                                <Input
                                    id="subject"
                                    placeholder="如：高等数学"
                                    value={formData.subject}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date">考试日期</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="score">总分</Label>
                                <Input
                                    id="score"
                                    type="number"
                                    value={formData.totalScore}
                                    onChange={(e) => setFormData(prev => ({ ...prev, totalScore: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                resetForm()
                                setIsOpen(false)
                            }}>
                                取消
                            </Button>
                            <Button onClick={handleSubmit} className="bg-gradient-to-r from-violet-500 to-indigo-500">
                                {editingExam ? '保存' : '添加'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {sortedExams.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">暂无考试安排</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            添加你的第一个考试，开始智能学习规划
                        </p>
                        <Button onClick={() => setIsOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            添加考试
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedExams.map(exam => {
                        const examDate = new Date(exam.date)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const daysLeft = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        const isPast = daysLeft < 0

                        return (
                            <Card key={exam.id} className={isPast ? 'opacity-60' : ''}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{exam.name}</CardTitle>
                                            <CardDescription>{exam.subject}</CardDescription>
                                        </div>
                                        <Badge
                                            variant={isPast ? 'secondary' : daysLeft <= 7 ? 'destructive' : daysLeft <= 14 ? 'secondary' : 'outline'}
                                        >
                                            {isPast ? '已结束' : `${daysLeft}天后`}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(exam.date).toLocaleDateString('zh-CN')}
                                        </span>
                                        <span>满分 {exam.totalScore}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleEdit(exam)}
                                        >
                                            <Edit className="h-4 w-4 mr-1" />
                                            编辑
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(exam.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
