import type { PluginSiteStatusResponse } from "@knotcms/shared"
import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import {
    fetchPluginConfig,
    fetchPluginSiteStatus,
    type PluginConfig,
} from "../pluginApi"

export type PluginLoadState = "loading" | "ready" | "unavailable"

export interface PluginState {
    loadState: PluginLoadState
    config: PluginConfig | null
    framerProjectId: string | null
    framerProjectName: string | null
    siteStatus: PluginSiteStatusResponse | null
    statusError: string | null
}

export function usePluginState(): PluginState {
    const [loadState, setLoadState] = useState<PluginLoadState>("loading")
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [framerProjectId, setFramerProjectId] = useState<string | null>(null)
    const [framerProjectName, setFramerProjectName] = useState<string | null>(null)
    const [siteStatus, setSiteStatus] = useState<PluginSiteStatusResponse | null>(null)
    const [statusError, setStatusError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const [projectInfo, pluginConfig] = await Promise.all([
                    framer.getProjectInfo(),
                    fetchPluginConfig(),
                ])

                if (cancelled) return

                const projectId = projectInfo.id?.trim() || null
                setConfig(pluginConfig)
                setFramerProjectName(projectInfo.name)
                setFramerProjectId(projectId)

                if (!projectId) {
                    setStatusError("Could not read this Framer project.")
                    setLoadState("ready")
                    return
                }

                try {
                    const status = await fetchPluginSiteStatus(projectId, projectInfo.name)
                    if (!cancelled) {
                        setSiteStatus(status)
                        setStatusError(null)
                    }
                } catch (error) {
                    if (!cancelled) {
                        const message =
                            error instanceof Error
                                ? error.message
                                : "Could not check whether KnotCMS is connected."
                        setStatusError(message)
                    }
                }
            } catch {
                if (!cancelled) {
                    setLoadState("unavailable")
                }
                return
            }

            if (!cancelled) {
                setLoadState("ready")
            }
        }

        void load()
        return () => {
            cancelled = true
        }
    }, [])

    return {
        loadState,
        config,
        framerProjectId,
        framerProjectName,
        siteStatus,
        statusError,
    }
}
