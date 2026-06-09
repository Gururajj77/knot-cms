import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { CheckCircle2, Info, X, XCircle } from "lucide-react"
import { cn } from "../../lib/cn"

export type ToastTone = "success" | "error" | "info"

interface ToastItem {
    id: number
    tone: ToastTone
    message: string
}

interface ToastContextValue {
    toast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const toast = useCallback((message: string, tone: ToastTone = "info") => {
        const id = ++toastId
        setToasts(prev => [...prev, { id, tone, message }])
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    const dismiss = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    const icons = {
        success: CheckCircle2,
        error: XCircle,
        info: Info,
    }

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="pf-toast-stack" aria-live="polite">
                {toasts.map(item => {
                    const Icon = icons[item.tone]
                    return (
                        <div key={item.id} className={cn("pf-toast", `pf-toast--${item.tone}`)} role="status">
                            <Icon size={16} className="pf-toast-icon" aria-hidden />
                            <span className="pf-toast-message">{item.message}</span>
                            <button
                                type="button"
                                className="pf-toast-dismiss"
                                onClick={() => dismiss(item.id)}
                                aria-label="Dismiss"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error("useToast must be used within ToastProvider")
    return ctx
}
