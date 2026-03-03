import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { cn } from "../../lib/utils"

export type ToastType = "default" | "success" | "error" | "info"

export interface ToastProps {
    id: string
    title?: string
    description?: string
    type?: ToastType
    duration?: number
    onClose: (id: string) => void
}

const icons = {
    default: null,
    success: <CheckCircle className="w-5 h-5 text-[#00A336]" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
}

export function Toast({ id, title, description, type = "default", duration = 4000, onClose }: ToastProps) {
    React.useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => onClose(id), duration)
            return () => clearTimeout(timer)
        }
    }, [id, duration, onClose])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
                "pointer-events-auto relative flex w-full max-w-[340px] items-start gap-4 overflow-hidden rounded-[16px] border border-[#18181b] bg-[#0A0A0A]/90 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md",
                type === "success" && "border-[#00A336]/30 shadow-[0_8px_30px_rgba(0,163,54,0.15)]",
                type === "error" && "border-red-500/30 shadow-[0_8px_30px_rgba(239,68,68,0.15)]",
            )}
        >
            {icons[type] && <div className="mt-0.5 flex-shrink-0">{icons[type]}</div>}
            <div className="flex w-full flex-col gap-1">
                {title && <h3 className="text-[14px] font-bold text-white">{title}</h3>}
                {description && <p className="text-[13px] font-medium text-[#A1A1AA]">{description}</p>}
            </div>
            <button
                onClick={() => onClose(id)}
                className="absolute right-2 top-2 rounded-md p-1 text-[#52525b] hover:text-white transition-colors focus:opacity-100 focus:outline-none"
            >
                <X className="h-4 w-4" />
            </button>
        </motion.div>
    )
}

export function ToastContainer({ toasts, onClose }: { toasts: Omit<ToastProps, 'onClose'>[], onClose: (id: string) => void }) {
    return (
        <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-4 sm:right-4 sm:top-auto sm:flex-col gap-3 pointer-events-none sm:w-auto">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <Toast key={toast.id} {...toast} onClose={onClose} />
                ))}
            </AnimatePresence>
        </div>
    )
}
