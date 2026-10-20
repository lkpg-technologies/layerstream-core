export interface Content {
    type: "url" | "image" | "video" | "color",
    src: string,
    id: string,
    // Remount a "url" tile this often, recovers pages that failed to load
    refreshSeconds?: number
}