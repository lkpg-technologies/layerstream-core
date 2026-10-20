import type { Content } from "./Content"

export interface LayoutType {
    template: string[][],
    cssTemplateSize: {
        columns: string,
        rows: string
    },
    gap: string,
    content: Content | Content[]
}