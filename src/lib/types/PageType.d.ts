import type { LayoutType } from "./LayoutType";

export interface PageType {
    bgColor: string,
    type: "grid" | "fullscreen",
    duration: number,
    layout: LayoutType
}