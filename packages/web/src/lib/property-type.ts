const TYPE_LABELS: Record<string, string> = {
    title: "Title",
    rich_text: "Text",
    number: "Number",
    select: "Select",
    multi_select: "Multi-select",
    date: "Date",
    checkbox: "Checkbox",
    url: "URL",
    email: "Email",
    phone_number: "Phone",
    files: "Files",
    relation: "Relation",
    formula: "Formula",
    rollup: "Rollup",
    created_time: "Created",
    created_by: "Created by",
    last_edited_time: "Edited",
    last_edited_by: "Edited by",
    status: "Status",
    people: "People",
}

export function formatPropertyType(type: string): string {
    return TYPE_LABELS[type] ?? type.replace(/_/g, " ")
}
