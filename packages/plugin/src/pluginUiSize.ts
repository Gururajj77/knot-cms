import type { UIOptions } from "framer-plugin"

export function getPluginUiOptions(): UIOptions {
    return {
        width: 360,
        height: 400,
        minWidth: 320,
        minHeight: 360,
        maxWidth: 400,
        maxHeight: 520,
        resizable: true,
    }
}
