import type { UIOptions } from "framer-plugin"

export function getPluginUiOptions(): UIOptions {
    return {
        width: 360,
        height: 520,
        minWidth: 320,
        minHeight: 460,
        maxWidth: 400,
        maxHeight: 640,
        resizable: true,
    }
}
