/** Best-effort per-isolate rate limit for credential probes. */
const buckets = new Map<string, number[]>()

export function allowRateLimitedAction(key: string, max: number, windowMs: number): boolean {
    const now = Date.now()
    const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs)
    if (hits.length >= max) return false
    hits.push(now)
    buckets.set(key, hits)
    return true
}
