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

export type WidgetSettingV1 = ColorSettingV1 | WebpageSettingV1


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

export type WidgetV1 = ColorWidgetV1 | WebpageWidgetV1

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
