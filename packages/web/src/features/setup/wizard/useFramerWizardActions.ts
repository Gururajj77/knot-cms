import { buildFramerSyncTarget } from "@knotcms/shared"
import { useCallback, useEffect, useRef } from "react"
import { fetchDashboardFramerCollections } from "../../../lib/api"
import { ApiError } from "../../../lib/api/client"
import { DEFAULT_SETUP_PATH } from "./framer-display"
import type { WizardStateBag } from "./useWizardState"

type FramerWizardDeps = Pick<
    WizardStateBag,
    | "framerProjectUrl"
    | "framerApiKey"
    | "collections"
    | "setCollections"
    | "collectionsLoaded"
    | "setCollectionsLoaded"
    | "selectedFramerCollectionId"
    | "setSelectedFramerCollectionId"
    | "framerSyncTarget"
    | "setFramerSyncTarget"
    | "setWizardError"
    | "setBusy"
    | "setStep"
    | "path"
    | "setPath"
    | "setFramerProjectUrl"
    | "setFramerApiKey"
>

export function useFramerWizardActions(state: FramerWizardDeps) {
    const {
        framerProjectUrl,
        framerApiKey,
        collections,
        setCollections,
        collectionsLoaded,
        setCollectionsLoaded,
        selectedFramerCollectionId,
        setSelectedFramerCollectionId,
        framerSyncTarget,
        setFramerSyncTarget,
        setWizardError,
        setBusy,
        setStep,
        path,
        setPath,
        setFramerProjectUrl,
        setFramerApiKey,
    } = state

    const selectFramerCollection = useCallback(
        (collectionId: string | null) => {
            setSelectedFramerCollectionId(collectionId)
            if (!collectionId) {
                setFramerSyncTarget(null)
                return
            }

            const collection = collections.find(item => item.id === collectionId)
            if (collection) {
                setFramerSyncTarget(buildFramerSyncTarget(collection))
            }
        },
        [collections, setFramerSyncTarget, setSelectedFramerCollectionId]
    )

    const loadCollections = useCallback(async () => {
        if (!framerProjectUrl.trim() || !framerApiKey.trim()) {
            setWizardError("Enter your Framer project URL and API key first.")
            return
        }

        setBusy(true)
        setWizardError(null)
        try {
            const nextCollections = await fetchDashboardFramerCollections({
                framerProjectUrl: framerProjectUrl.trim(),
                framerApiKey: framerApiKey.trim(),
            })
            setCollections(nextCollections)
            setCollectionsLoaded(true)

            const templateId = framerSyncTarget?.templateCollectionId ?? selectedFramerCollectionId
            const selected = templateId
                ? nextCollections.find(collection => collection.id === templateId)
                : null

            if (templateId && !selected) {
                setSelectedFramerCollectionId(null)
                setFramerSyncTarget(null)
            } else if (selected) {
                setSelectedFramerCollectionId(selected.id)
                setFramerSyncTarget(buildFramerSyncTarget(selected))
            }
        } catch (err) {
            setCollectionsLoaded(false)
            setWizardError(
                err instanceof ApiError
                    ? err.message
                    : "Could not load Framer collections. Check the URL and API key."
            )
        } finally {
            setBusy(false)
        }
    }, [
        framerApiKey,
        framerProjectUrl,
        framerSyncTarget,
        selectedFramerCollectionId,
        setBusy,
        setCollections,
        setCollectionsLoaded,
        setFramerSyncTarget,
        setSelectedFramerCollectionId,
        setWizardError,
    ])

    const autoLoadedCollections = useRef(false)
    useEffect(() => {
        if (autoLoadedCollections.current || collectionsLoaded) return
        if (!(framerSyncTarget || selectedFramerCollectionId)) return
        if (!framerProjectUrl.trim() || framerApiKey.trim().length < 8) return

        autoLoadedCollections.current = true
        void loadCollections()
    }, [
        collectionsLoaded,
        framerApiKey,
        framerProjectUrl,
        framerSyncTarget,
        loadCollections,
        selectedFramerCollectionId,
    ])

    const handleFramerUrlChange = useCallback(
        (url: string) => {
            setFramerProjectUrl(url)
            setCollectionsLoaded(false)
            setCollections([])
        },
        [setCollections, setCollectionsLoaded, setFramerProjectUrl]
    )

    const handleFramerKeyChange = useCallback(
        (key: string) => {
            setFramerApiKey(key)
            setCollectionsLoaded(false)
            setCollections([])
        },
        [setCollections, setCollectionsLoaded, setFramerApiKey]
    )

    const continueFromFramer = useCallback(() => {
        if (!collectionsLoaded) return
        if (!path) {
            const suggested = selectedFramerCollectionId != null ? "framer_to_notion" : DEFAULT_SETUP_PATH
            setPath(suggested)
        }
        setStep("notion")
    }, [collectionsLoaded, path, selectedFramerCollectionId, setPath, setStep])

    return {
        selectFramerCollection,
        loadCollections,
        handleFramerUrlChange,
        handleFramerKeyChange,
        continueFromFramer,
    }
}
