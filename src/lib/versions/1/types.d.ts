export interface Setting<T> {
    value: T
}

export interface WidgetV1 {
    type: "color" | "webpage" | string,
    properties: {
        size: { w: number, h: number },
        position: { x: number, y: number }
    },
    settings: {
        color?: Setting<string>,
        webpage?: Setting<string>,
        network?: Setting<boolean>,
        /** Remount a "webpage" widget this often, recovers pages that failed to load */ 
        refreshSeconds?: Setting<number>,
        [key: string]: Setting<unknown> | undefined
    }
}

export interface ScreenV1 {
    durationSeconds: number,
    widgetOrder: string[],
    widgets: Record<string, WidgetV1>
}

export interface ConfigV1 {
    version: 1,
    screens: Record<string, ScreenV1>,
    screenOrder: string[]
}
