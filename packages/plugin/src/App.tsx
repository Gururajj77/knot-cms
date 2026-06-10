import type { ManagedCollection } from "framer-plugin"
import { ConnectPanel } from "./ConnectPanel"

interface AppProps {
    collection: ManagedCollection
    syncMode?: boolean
}

export function App({ collection, syncMode }: AppProps) {
    return <ConnectPanel collection={collection} syncMode={syncMode} />
}
