import "framer-plugin/framer.css"

import { framer } from "framer-plugin"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import { getPluginUiOptions } from "./pluginUiSize"

const collection = await framer.getActiveManagedCollection()
const syncMode = framer.mode === "syncManagedCollection"

framer.showUI(getPluginUiOptions(syncMode))

const root = document.getElementById("root")
if (!root) throw new Error("Root element not found")

createRoot(root).render(
    <StrictMode>
        <App collection={collection} syncMode={syncMode} />
    </StrictMode>
)
