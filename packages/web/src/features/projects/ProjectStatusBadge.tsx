import type { ProjectStatus } from "@knotcms/shared"
import { projectHealthLabel, projectHealthTone } from "../../lib/project-health"
import { Badge } from "../../components/ui"

interface ProjectStatusBadgeProps {
    status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
    return <Badge tone={projectHealthTone(status)}>{projectHealthLabel(status)}</Badge>
}
