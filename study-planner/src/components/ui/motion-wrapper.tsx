'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

interface MotionWrapperProps {
    children: ReactNode
    delay?: number
    className?: string
    animation?: 'fade-up' | 'fade-in' | 'scale' | 'slide-right'
}

const animations = {
    'fade-up': {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
    },
    'fade-in': {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    },
    'scale': {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
    },
    'slide-right': {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    },
}

export function MotionWrapper({
    children,
    delay = 0,
    className = '',
    animation = 'fade-up'
}: MotionWrapperProps) {
    return (
        <motion.div
            initial={animations[animation].initial}
            animate={animations[animation].animate}
            exit={animations[animation].exit}
            transition={{
                duration: 0.3,
                delay,
                ease: [0.21, 0.47, 0.32, 0.98]
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

export function StaggerContainer({
    children,
    className = '',
    delayChildren = 0.1,
    staggerChildren = 0.1
}: {
    children: ReactNode
    className?: string
    delayChildren?: number
    staggerChildren?: number
}) {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{
                hidden: {},
                show: {
                    transition: {
                        delayChildren,
                        staggerChildren,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

export const motionItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
}
