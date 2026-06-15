import type { UIOptions } from "framer-plugin"

export function getPluginUiOptions(): UIOptions {
    return {
        width: 380,
        height: 520,
        minWidth: 340,
        minHeight: 440,
        maxWidth: 420,
        maxHeight: 640,
        resizable: true,
    }
}
