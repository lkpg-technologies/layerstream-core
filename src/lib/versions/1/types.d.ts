export interface SettingV1<T> {
    value: T
}

export interface WidgetV1 {
    type: "color" | "webpage" | string,
    properties: {
        size: { w: number, h: number },
        position: { x: number, y: number }
    },
    settings: {
        color?: SettingV1<string>,
        webpage?: SettingV1<string>,
        network?: SettingV1<boolean>,
        /** Remount a "webpage" widget this often, recovers pages that failed to load */ 
        refreshSeconds?: SettingV1<number>,
        [key: string]: SettingV1<unknown> | undefined
    }
}

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
