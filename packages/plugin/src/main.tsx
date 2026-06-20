import "framer-plugin/framer.css"
import "./styles/index.css"

import { framer } from "framer-plugin"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import { getPluginUiOptions } from "./pluginUiSize"
import { initPluginTheme } from "./usePluginTheme"

initPluginTheme()
framer.showUI(getPluginUiOptions())

const root = document.getElementById("root")
if (!root) throw new Error("Root element not found")

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
)
