export interface Content {
    type: "url" | "image" | "video" | "color",
    src: string,
    id: string
}