import { useCallback, useEffect, useState } from "react"

interface UseAsyncDataResult<T> {
    data: T | null
    error: string | null
    loading: boolean
    refresh: () => Promise<void>
}

/** Generic fetch hook — keeps pages thin. */
export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): UseAsyncDataResult<T> {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setData(await loader())
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }, deps)

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { data, error, loading, refresh }
}
