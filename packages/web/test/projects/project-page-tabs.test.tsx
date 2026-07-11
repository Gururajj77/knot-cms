import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ProjectPageTabs } from "../../src/features/projects/ProjectPageTabs"

afterEach(cleanup)

describe("ProjectPageTabs", () => {
    it("renders overview and settings tabs with the active state", () => {
        const onChange = vi.fn()
        render(<ProjectPageTabs active="overview" onChange={onChange} />)

        const overview = screen.getByRole("tab", { name: "Overview" })
        const settings = screen.getByRole("tab", { name: "Settings" })

        expect(overview.getAttribute("aria-selected")).toBe("true")
        expect(settings.getAttribute("aria-selected")).toBe("false")

        fireEvent.click(settings)
        expect(onChange).toHaveBeenCalledWith("settings")
    })
})
