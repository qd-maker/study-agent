'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
    BookOpen,
    Target,
    Settings,
    GraduationCap,
    Brain
} from 'lucide-react'

const navItems = [
    { href: '/', label: '仪表盘', icon: BookOpen },
    { href: '/exams', label: '考试管理', icon: GraduationCap },
    { href: '/weakness', label: '知识点学习', icon: Target },
    { href: '/review', label: '复习计划', icon: Brain },
    { href: '/settings', label: '设置', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border/50 bg-sidebar/60 backdrop-blur-xl">
            <div className="flex h-20 items-center gap-3 px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/20">
                    <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-500">
                    学习助手
                </span>
            </div>

            <nav className="flex flex-col gap-2 p-4">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href ||
                        (item.href === '/weakness' && pathname.startsWith('/learn'))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-tab"
                                    className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30
                                    }}
                                />
                            )}

                            <Icon className={cn(
                                'relative z-10 h-5 w-5 transition-colors',
                                isActive ? 'text-primary' : 'group-hover:text-primary'
                            )} />
                            <span className="relative z-10">{item.label}</span>

                            {isActive && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                                />
                            )}
                        </Link>
                    )
                })}
            </nav>

            <div className="absolute bottom-8 left-0 w-full px-6">
                <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/5 p-4 border border-primary/10 backdrop-blur-sm">
                    <p className="text-xs font-semibold text-primary mb-1">AI 助手在线</p>
                    <p className="text-[10px] text-muted-foreground">随时准备为您规划学习路径</p>
                </div>
            </div>
        </aside>
    )
}
