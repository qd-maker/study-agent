import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    gradient?: boolean
}

export function GlassCard({
    children,
    className,
    gradient = false,
    ...props
}: GlassCardProps) {
    return (
        <div
            className={cn(
                'glass rounded-xl p-6 transition-all duration-300',
                gradient && 'bg-gradient-to-br from-card/80 to-card/40',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
