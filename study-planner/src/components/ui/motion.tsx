'use client'

import { motion, type HTMLMotionProps, type Variants } from 'framer-motion'
import { forwardRef } from 'react'

// 淡入动画
export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
}

// 从下方滑入
export const slideUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

// 从左滑入
export const slideRight: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

// 缩放进入
export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } }
}

// 交错子元素动画
export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
}

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

// 动画容器组件
interface MotionContainerProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode
    delay?: number
}

export const FadeIn = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, delay = 0, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.4, delay } }
            }}
            {...props}
        >
            {children}
        </motion.div>
    )
)
FadeIn.displayName = 'FadeIn'

export const SlideUp = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, delay = 0, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: 'easeOut' } }
            }}
            {...props}
        >
            {children}
        </motion.div>
    )
)
SlideUp.displayName = 'SlideUp'

export const ScaleIn = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, delay = 0, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1, transition: { duration: 0.4, delay, ease: 'easeOut' } }
            }}
            {...props}
        >
            {children}
        </motion.div>
    )
)
ScaleIn.displayName = 'ScaleIn'

// 交错列表容器
export const StaggerList = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            {...props}
        >
            {children}
        </motion.div>
    )
)
StaggerList.displayName = 'StaggerList'

// 交错列表项
export const StaggerItem = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, ...props }, ref) => (
        <motion.div ref={ref} variants={staggerItem} {...props}>
            {children}
        </motion.div>
    )
)
StaggerItem.displayName = 'StaggerItem'

// 悬浮效果
export const HoverScale = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, ...props }, ref) => (
        <motion.div
            ref={ref}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            {...props}
        >
            {children}
        </motion.div>
    )
)
HoverScale.displayName = 'HoverScale'

// 页面过渡
export const PageTransition = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            {...props}
        >
            {children}
        </motion.div>
    )
)
PageTransition.displayName = 'PageTransition'
