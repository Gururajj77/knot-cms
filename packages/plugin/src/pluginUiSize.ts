import type { UIOptions } from "framer-plugin"

export function getPluginUiOptions(): UIOptions {
    return {
        width: 380,
        height: 560,
        minWidth: 340,
        minHeight: 480,
        maxWidth: 420,
        maxHeight: 720,
        resizable: true,
    }
}
