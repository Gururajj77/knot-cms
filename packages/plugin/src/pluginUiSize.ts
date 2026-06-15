import type { UIOptions } from "framer-plugin"

export function getPluginUiOptions(): UIOptions {
    return {
        width: 360,
        height: 500,
        minWidth: 320,
        minHeight: 420,
        maxWidth: 400,
        maxHeight: 680,
        resizable: true,
    }
}
