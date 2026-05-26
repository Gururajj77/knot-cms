import "framer-plugin/framer.css"

import { framer } from "framer-plugin"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import { PLUGIN_KEYS, syncExistingCollection } from "./data"

const activeCollection = await framer.getActiveManagedCollection()

const projectId = await activeCollection.getPluginData(PLUGIN_KEYS.PROJECT_ID)
const previousDataSourceId = await activeCollection.getPluginData(PLUGIN_KEYS.DATA_SOURCE_ID)
const previousSlugFieldId = await activeCollection.getPluginData(PLUGIN_KEYS.SLUG_FIELD_ID)
const collectionName = await activeCollection.getPluginData(PLUGIN_KEYS.COLLECTION_NAME)

const { didSync } = await syncExistingCollection(projectId, collectionName)

if (didSync) {
    // syncExistingCollection closes the plugin on success
} else {
    const root = document.getElementById("root")
    if (!root) throw new Error("Root element not found")

    createRoot(root).render(
        <StrictMode>
            <App
                collection={activeCollection}
                projectId={projectId}
                previousDataSourceId={previousDataSourceId}
                previousSlugFieldId={previousSlugFieldId}
            />
        </StrictMode>
    )
}
