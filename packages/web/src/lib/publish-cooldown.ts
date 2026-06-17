import { useEffect, useState } from "react"

function formatCooldownDuration(totalSec: number): string {
    if (totalSec < 60) return `${totalSec}s`
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`
}

export function formatPublishCooldownMessage(remainingSec: number): string {
    return `Live publish on cooldown (${formatCooldownDuration(remainingSec)} remaining). CMS still syncs — publish manually in the Framer dashboard, or wait for the next sync to auto-publish.`
}

/** Tick down server-provided remaining seconds locally between status checks. */
export function usePublishCooldownRemaining(initial: number | null | undefined): number {
    const [remaining, setRemaining] = useState(initial ?? 0)

    useEffect(() => {
        if (initial == null || initial <= 0) {
            setRemaining(0)
            return
        }

        setRemaining(initial)
        const interval = window.setInterval(() => {
            setRemaining(current => Math.max(0, current - 1))
        }, 1000)

        return () => window.clearInterval(interval)
    }, [initial])

    return remaining
}
