import type { PluginSiteStatusResponse } from "@knotcms/shared"
import { buildFramerProjectUrlFromEditorId } from "@knotcms/shared"
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
    framerProjectUrl: string | null
    framerProjectName: string | null
    siteStatus: PluginSiteStatusResponse | null
    statusError: string | null
}

export function usePluginState(): PluginState {
    const [loadState, setLoadState] = useState<PluginLoadState>("loading")
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [framerProjectUrl, setFramerProjectUrl] = useState<string | null>(null)
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

                const projectUrl = buildFramerProjectUrlFromEditorId(projectInfo.id)
                setConfig(pluginConfig)
                setFramerProjectName(projectInfo.name)
                setFramerProjectUrl(projectUrl || null)

                if (!projectUrl) {
                    setStatusError("Could not read this Framer project.")
                    setLoadState("ready")
                    return
                }

                try {
                    const status = await fetchPluginSiteStatus(projectUrl)
                    if (!cancelled) {
                        setSiteStatus(status)
                        setStatusError(null)
                    }
                } catch {
                    if (!cancelled) {
                        setStatusError("Could not check whether KnotCMS is connected.")
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
        framerProjectUrl,
        framerProjectName,
        siteStatus,
        statusError,
    }
}
