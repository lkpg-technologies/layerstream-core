export interface SettingV1<T> {
    value: T
}

export interface ColorSettingV1 {
    color: SettingV1<string>,
}

export interface WebpageSettingV1 {
    webpage?: SettingV1<string>,
    network?: SettingV1<boolean>,
}

export interface ImageSettingV1 {
    src: SettingV1<string>,
    asset?: SettingV1<string>,
    fit?: SettingV1<"contain" | "cover" | "fill" | "none" | "scale-down">,
}

export interface VideoSettingV1 extends ImageSettingV1 {
    loop?: SettingV1<boolean>,
    muted?: SettingV1<boolean>,
}

export type WidgetSettingV1 = ColorSettingV1 | WebpageSettingV1 | ImageSettingV1 | VideoSettingV1


interface WidgetBaseV1 {
    properties: {
        size: { w: number, h: number },
        position: { x: number, y: number }
    },
}

export interface ColorWidgetV1 extends WidgetBaseV1 {
    type: "color",
    settings: ColorSettingV1
}

export interface WebpageWidgetV1 extends WidgetBaseV1 {
    type: "webpage",
    settings: WebpageSettingV1
}

export interface ImageWidgetV1 extends WidgetBaseV1 {
    type: "image",
    settings: ImageSettingV1
}

export interface VideoWidgetV1 extends WidgetBaseV1 {
    type: "video",
    settings: VideoSettingV1
}

export type WidgetV1 = ColorWidgetV1 | WebpageWidgetV1 | ImageWidgetV1 | VideoWidgetV1

export interface ScreenV1 {
    id: string,
    name: string,
    durationSeconds: number,
    widgetOrder: string[],
    widgets: Record<string, WidgetV1>
}

export interface ConfigV1 {
    version: 1,
    screens: Record<string, ScreenV1>,
    screenOrder: string[]
}
