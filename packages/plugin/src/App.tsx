import "./App.css"

import { framer, type ManagedCollection } from "framer-plugin"
import { useEffect, useLayoutEffect, useState } from "react"
import { ConnectNotion } from "./ConnectNotion"
import { FieldMapping } from "./FieldMapping"
import type { NotionDataSourceConfig } from "./data"
import { PLUGIN_KEYS } from "./data"
import { getPluginUiOptions, type PluginStep } from "./pluginUiSize"
import { SelectDataSource } from "./SelectDataSource"
import { StatusPanel } from "./StatusPanel"

interface AppProps {
    collection: ManagedCollection
    projectId: string | null
    previousDataSourceId: string | null
    previousSlugFieldId: string | null
}

export function App({ collection, projectId, previousSlugFieldId }: AppProps) {
    const [step, setStep] = useState<PluginStep>(projectId ? "status" : "connect")
    const [setupSessionId, setSetupSessionId] = useState<string | null>(null)
    const [dataSource, setDataSource] = useState<NotionDataSourceConfig | null>(null)
    const [notionTitleHint, setNotionTitleHint] = useState<string | null>(null)

    useEffect(() => {
        void collection.getPluginData(PLUGIN_KEYS.COLLECTION_NAME).then(name => setNotionTitleHint(name || null))
    }, [collection])

    useLayoutEffect(() => {
        framer.showUI(getPluginUiOptions(step))
    }, [step])

    if (step === "status" && projectId) {
        return (
            <StatusPanel
                projectId={projectId}
                notionTitleHint={notionTitleHint}
                onReconfigure={() => setStep("connect")}
            />
        )
    }

    if (step === "connect") {
        return (
            <ConnectNotion
                onConnected={sessionId => {
                    setSetupSessionId(sessionId)
                    setStep("source")
                }}
            />
        )
    }

    if (step === "source" && setupSessionId) {
        return (
            <SelectDataSource
                setupSessionId={setupSessionId}
                onBack={() => setStep("connect")}
                onSelectDataSource={config => {
                    setDataSource(config)
                    setStep("mapping")
                }}
            />
        )
    }

    if (step === "mapping" && setupSessionId && dataSource) {
        return (
            <FieldMapping
                collection={collection}
                dataSource={dataSource}
                setupSessionId={setupSessionId}
                initialSlugFieldId={previousSlugFieldId}
                existingProjectId={projectId}
            />
        )
    }

    return null
}
