import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import type { FieldMapping } from "@knotcms/shared"
import type { FramerCollectionSummary } from "../../src/lib/api"
import { NEW_PROJECT_SETUP_STEPS } from "../../src/features/setup/constants"
import { FramerCollectionPicker } from "../../src/features/setup/steps/FramerCollectionPicker"
import { ReviewStep } from "../../src/features/setup/steps/ReviewStep"
import { SetupConnectStep } from "../../src/features/setup/steps/SetupConnectStep"

afterEach(cleanup)

const collection: FramerCollectionSummary = {
    id: "collection-1",
    name: "Expenses",
    managedBy: "user",
    canUseAsTemplate: true,
    itemCount: 3,
    fields: [{ id: "title", name: "Title", type: "string" }],
    bootstrapPreview: {
        eligible: true,
        mappedFieldCount: 1,
        skippedFieldCount: 0,
        titleFieldId: "title",
        warnings: [],
    },
}

const mappings: FieldMapping[] = [
    {
        notionPropertyId: "title",
        notionPropertyName: "Expense",
        notionPropertyType: "title",
        framerFieldId: "title",
        framerFieldName: "Expense",
        framerFieldType: "string",
        ignored: false,
    },
    {
        notionPropertyId: "amount",
        notionPropertyName: "Amount",
        notionPropertyType: "number",
        framerFieldId: "amount",
        framerFieldName: "Amount",
        framerFieldType: "number",
        ignored: false,
    },
    {
        notionPropertyId: "paid",
        notionPropertyName: "Paid",
        notionPropertyType: "checkbox",
        framerFieldId: "paid",
        framerFieldName: "Paid",
        framerFieldType: "boolean",
        ignored: false,
    },
]

function renderReview(overrides: Partial<React.ComponentProps<typeof ReviewStep>> = {}) {
    const props: React.ComponentProps<typeof ReviewStep> = {
        path: "notion_to_framer",
        connectorId: "notion",
        setupSessionId: "session-1",
        sources: [],
        selectedSource: { id: "source-1", title: "Expenses" },
        selectedFramerCollection: collection,
        mappings,
        ignored: new Set(),
        slugOptions: mappings,
        slugPropertyId: "title",
        autoSync: true,
        autoPublish: true,
        publishMode: "deploy_live",
        importRowMax: 100,
        importRowCount: 0,
        bootstrapWarnings: [],
        busy: false,
        canCreateProject: true,
        canSync: true,
        hasAutoSync: true,
        hasAutoPublish: true,
        framerSyncMode: "user",
        selectedFramerCollectionName: collection.name,
        canChooseSyncDestination: false,
        syncDestination: "new_managed",
        newManagedCollectionName: "Expenses",
        schemaWarnings: [],
        showAdvanced: false,
        collections: [collection],
        collectionsLoaded: true,
        selectedFramerCollectionId: collection.id,
        framerProjectUrl: "https://framer.com/projects/example",
        framerApiKey: "test-api-key",
        onLoadCollections: vi.fn(),
        onSelectCollection: vi.fn(),
        onPathChange: vi.fn(),
        onShowAdvancedChange: vi.fn(),
        onImportRowCountChange: vi.fn(),
        onSelectAllImportRows: vi.fn(),
        onBootstrapSource: vi.fn(),
        onSelectExistingSource: vi.fn(),
        onSyncDestinationChange: vi.fn(),
        onSlugChange: vi.fn(),
        onAutoSyncChange: vi.fn(),
        onAutoPublishChange: vi.fn(),
        onPublishModeChange: vi.fn(),
        onToggleIgnored: vi.fn(),
        onFieldNameChange: vi.fn(),
        onBack: vi.fn(),
        onSubmit: vi.fn(),
        ...overrides,
    }

    render(
        <MemoryRouter>
            <ReviewStep {...props} />
        </MemoryRouter>
    )
    return props
}

describe("new project setup", () => {
    it("uses the streamlined two-step sequence", () => {
        expect(NEW_PROJECT_SETUP_STEPS).toEqual([
            { id: "connect", label: "Connect" },
            { id: "review", label: "Review & sync" },
        ])
    })

    it("shows Framer collection selection on the connect step", () => {
        render(
            <MemoryRouter>
                <SetupConnectStep
                    connectorId={null}
                    setupSessionId={null}
                    framerProjectUrl=""
                    framerApiKey=""
                    collections={[]}
                    selectedCollectionId={null}
                    collectionsLoaded={false}
                    framerCredentialsVerified={false}
                    path="notion_to_framer"
                    showAdvanced={false}
                    busy={false}
                    awaitingConnectorId={null}
                    onConnect={vi.fn()}
                    onConnectInTab={vi.fn()}
                    onUrlChange={vi.fn()}
                    onKeyChange={vi.fn()}
                    onLoadCollections={vi.fn()}
                    onSelectCollection={vi.fn()}
                    onPathChange={vi.fn()}
                    onShowAdvancedChange={vi.fn()}
                    onContinue={vi.fn()}
                />
            </MemoryRouter>
        )

        expect(screen.getByRole("heading", { name: "CMS collections (optional)" })).toBeTruthy()
        expect(screen.getByRole("button", { name: "Load collections" })).toBeTruthy()
    })

    it("requires a collection for an existing-collection path", () => {
        render(
            <MemoryRouter>
                <SetupConnectStep
                    connectorId="notion"
                    setupSessionId="session-1"
                    framerProjectUrl="https://framer.com/projects/example"
                    framerApiKey="test-api-key"
                    collections={[collection]}
                    selectedCollectionId={null}
                    collectionsLoaded
                    framerCredentialsVerified
                    path="connect_existing"
                    showAdvanced={false}
                    busy={false}
                    awaitingConnectorId={null}
                    onConnect={vi.fn()}
                    onConnectInTab={vi.fn()}
                    onUrlChange={vi.fn()}
                    onKeyChange={vi.fn()}
                    onLoadCollections={vi.fn()}
                    onSelectCollection={vi.fn()}
                    onPathChange={vi.fn()}
                    onShowAdvancedChange={vi.fn()}
                    onContinue={vi.fn()}
                />
            </MemoryRouter>
        )

        expect(screen.getByRole("heading", { name: "CMS collections" })).toBeTruthy()
        expect(screen.getByRole("button", { name: "Continue" })).toHaveProperty("disabled", true)
    })
})

describe("FramerCollectionPicker", () => {
    it("selects and clears a collection", async () => {
        const user = userEvent.setup()
        const onSelectCollection = vi.fn()

        render(
            <FramerCollectionPicker
                collections={[collection]}
                selectedCollectionId={null}
                collectionsLoaded
                busy={false}
                canLoad
                onLoadCollections={vi.fn()}
                onSelectCollection={onSelectCollection}
            />
        )

        await user.click(screen.getByRole("button", { name: /Expenses/ }))
        expect(onSelectCollection).toHaveBeenLastCalledWith(collection.id)

        cleanup()
        render(
            <FramerCollectionPicker
                collections={[collection]}
                selectedCollectionId={collection.id}
                collectionsLoaded
                busy={false}
                canLoad
                onLoadCollections={vi.fn()}
                onSelectCollection={onSelectCollection}
            />
        )
        await user.click(screen.getByRole("button", { name: /Expenses/ }))
        expect(onSelectCollection).toHaveBeenLastCalledWith(null)
    })
})

describe("review and slug selection", () => {
    it("shows all mapped fields without requiring an accordion", () => {
        renderReview()

        const mappingSection = screen.getByRole("heading", { name: "Field mapping" }).parentElement
            ?.parentElement
        expect(mappingSection).toBeTruthy()
        expect(within(mappingSection as HTMLElement).getByDisplayValue("Expense")).toBeTruthy()
        expect(within(mappingSection as HTMLElement).getByDisplayValue("Amount")).toBeTruthy()
        expect(within(mappingSection as HTMLElement).getByDisplayValue("Paid")).toBeTruthy()
    })

    it("defaults to the current slug and lets the user choose any mapped field", () => {
        const onSlugChange = vi.fn()
        renderReview({ onSlugChange })

        const select = screen.getByRole("combobox", { name: "Slug field" }) as HTMLSelectElement
        expect(select.value).toBe("title")
        expect(Array.from(select.options).map(option => option.text)).toEqual([
            "Expense",
            "Amount",
            "Paid",
        ])

        fireEvent.change(select, { target: { value: "amount" } })
        expect(onSlugChange).toHaveBeenCalledWith("amount")
    })
})
