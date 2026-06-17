import type { UIOptions } from "framer-plugin"

export function getPluginUiOptions(): UIOptions {
    return {
        width: 360,
        height: 480,
        minWidth: 320,
        minHeight: 420,
        maxWidth: 400,
        maxHeight: 560,
        resizable: true,
    }
}
