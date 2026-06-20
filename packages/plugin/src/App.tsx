import { ConnectPanel } from "./ConnectPanel"
import { usePluginTheme } from "./usePluginTheme"

export function App() {
    usePluginTheme()

    return <ConnectPanel />
}
