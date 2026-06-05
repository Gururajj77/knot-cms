import type { UIOptions } from "framer-plugin"

export type PluginStep = "intro" | "connect" | "source" | "mapping" | "status"

/** Default Framer plugin window size per wizard step (user can still resize). */
export function getPluginUiOptions(step: PluginStep): UIOptions {
    const wide = step === "mapping" || step === "status"
    const isStatus = step === "status"
    const isIntro = step === "intro"

    return {
        width: wide ? 560 : 440,
        height: isStatus ? 660 : wide ? 800 : isIntro ? 620 : 580,
        minWidth: wide ? 500 : 400,
        minHeight: isStatus ? 600 : wide ? 680 : isIntro ? 560 : 520,
        maxWidth: 880,
        maxHeight: 1000,
        resizable: true,
    }
}
