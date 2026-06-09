import { cn } from "../../lib/cn"

interface SkeletonProps {
    className?: string
    width?: string | number
    height?: string | number
}

export function Skeleton({ className, width, height }: SkeletonProps) {
    return (
        <span
            className={cn("pf-skeleton", className)}
            style={{ width, height }}
            aria-hidden
        />
    )
}

export function ProjectCardSkeleton() {
    return (
        <div className="pf-skeleton-row">
            <Skeleton width={28} height={28} className="pf-skeleton--square" />
            <div className="pf-skeleton-row-body">
                <Skeleton width="40%" height={14} />
                <Skeleton width="25%" height={12} />
            </div>
            <Skeleton width={64} height={22} className="pf-skeleton--pill" />
        </div>
    )
}
