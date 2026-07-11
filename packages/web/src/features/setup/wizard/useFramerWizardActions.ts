import { buildFramerSyncTarget } from "@knotcms/shared"
import { useCallback, useEffect, useRef } from "react"
import { fetchDashboardFramerCollections } from "../../../lib/api"
import { apiErrorMessage } from "../../../lib/api-errors"
import type { SetupStepId } from "../constants"
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
    | "setFramerProjectUrl"
    | "setFramerApiKey"
> & {
    skipCollectionPicker?: boolean
    nextStepAfterContinue?: SetupStepId
    requiresCollectionForContinue?: boolean
}

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
        setFramerProjectUrl,
        setFramerApiKey,
        skipCollectionPicker = false,
        nextStepAfterContinue = "source",
        requiresCollectionForContinue = false,
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
            return false
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
            return true
        } catch (err) {
            setCollectionsLoaded(false)
            setWizardError(
                apiErrorMessage(err, "Could not load Framer collections. Check the URL and API key.")
            )
            return false
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
        if (!skipCollectionPicker && !collectionsLoaded) return
        setStep(nextStepAfterContinue)
    }, [collectionsLoaded, nextStepAfterContinue, setStep, skipCollectionPicker])

    const continueFromConnect = useCallback(async () => {
        if (!framerProjectUrl.trim() || framerApiKey.trim().length < 8) {
            setWizardError("Enter your Framer project URL and API key.")
            return
        }

        if (requiresCollectionForContinue && !selectedFramerCollectionId) {
            setWizardError("Select a Framer CMS collection to continue.")
            return
        }

        const verified = collectionsLoaded ? true : await loadCollections()
        if (!verified) return

        setStep(nextStepAfterContinue)
    }, [
        collectionsLoaded,
        framerApiKey,
        framerProjectUrl,
        loadCollections,
        nextStepAfterContinue,
        requiresCollectionForContinue,
        selectedFramerCollectionId,
        setStep,
        setWizardError,
    ])

    return {
        selectFramerCollection,
        loadCollections,
        handleFramerUrlChange,
        handleFramerKeyChange,
        continueFromFramer,
        continueFromConnect,
    }
}
