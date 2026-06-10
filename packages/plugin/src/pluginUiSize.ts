import type { UIOptions } from "framer-plugin"

export function getPluginUiOptions(syncMode = false): UIOptions {
    return {
        width: 420,
        height: syncMode ? 380 : 560,
        minWidth: 360,
        minHeight: 320,
        maxWidth: 520,
        maxHeight: 720,
        resizable: true,
    }
}
