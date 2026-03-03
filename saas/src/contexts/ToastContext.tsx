import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { ToastContainer, type ToastProps, type ToastType } from "../components/ui/toast"

interface ToastContextType {
    toast: (options: { title?: string; description?: string; type?: ToastType; duration?: number }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Omit<ToastProps, "onClose">[]>([])

    const toast = useCallback(
        ({ title, description, type = "default", duration = 4000 }: { title?: string; description?: string; type?: ToastType; duration?: number }) => {
            const id = Math.random().toString(36).substr(2, 9)
            setToasts((prev) => [...prev, { id, title, description, type, duration }])
        },
        []
    )

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return context
}
