import { useCallback, useEffect, useState } from "react"
import { apiErrorMessage, isRateLimitError } from "../lib/api-errors"

interface UseAsyncDataResult<T> {
    data: T | null
    error: string | null
    errorTone: "error" | "info"
    loading: boolean
    refresh: () => Promise<void>
}

/** Generic fetch hook — keeps pages thin. */
export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): UseAsyncDataResult<T> {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [errorTone, setErrorTone] = useState<"error" | "info">("error")
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setData(await loader())
        } catch (err) {
            const message = apiErrorMessage(err, "Something went wrong")
            setError(message)
            setErrorTone(isRateLimitError(err) ? "info" : "error")
        } finally {
            setLoading(false)
        }
    }, deps)

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { data, error, errorTone, loading, refresh }
}
