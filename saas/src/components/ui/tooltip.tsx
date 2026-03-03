import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TooltipProps {
    content: React.ReactNode
    children: React.ReactNode
    side?: "top" | "right" | "bottom" | "left"
    delay?: number
}

export function Tooltip({ content, children, side = "top", delay = 200 }: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false)
    const timer = React.useRef<number | undefined>(undefined)

    const handleMouseEnter = () => {
        timer.current = window.setTimeout(() => setIsVisible(true), delay)
    }

    const handleMouseLeave = () => {
        if (timer.current !== undefined) window.clearTimeout(timer.current)
        setIsVisible(false)
    }

    const getPositionClasses = () => {
        switch (side) {
            case "top":
                return "bottom-full mb-2 left-1/2 -translate-x-1/2"
            case "right":
                return "left-full ml-2 top-1/2 -translate-y-1/2"
            case "bottom":
                return "top-full mt-2 left-1/2 -translate-x-1/2"
            case "left":
                return "right-full mr-2 top-1/2 -translate-y-1/2"
            default:
                return "bottom-full mb-2 left-1/2 -translate-x-1/2"
        }
    }

    return (
        <div
            className="relative flex items-center justify-center w-max"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: side === "top" ? 5 : side === "bottom" ? -5 : 0, x: side === "left" ? 5 : side === "right" ? -5 : 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`absolute z-[110] px-3 py-1.5 text-[12px] font-medium text-white bg-[#18181b] border border-[#27272a] rounded-md shadow-xl whitespace-nowrap pointer-events-none ${getPositionClasses()}`}
                    >
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
