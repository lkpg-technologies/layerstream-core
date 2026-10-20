// Normalizes config.json so components can trust its shape. Invalid screens,
// widgets and pages are dropped (with a warning) instead of crashing rendering.
import { reportError } from "./stability";
import type { Config } from "./types/Config";
import type { ConfigV1, ScreenV1, WidgetV1 } from "./versions/1/types";

type Obj = Record<string, any>;

function isObject(value: unknown): value is Obj {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): boolean {
    return typeof value === "number" && Number.isFinite(value);
}

function hasStringSetting(widget: Obj, key: string): boolean {
    return isObject(widget.settings[key]) && typeof widget.settings[key].value === "string";
}

function isValidWidget(widget: unknown): widget is WidgetV1 {
    if (!isObject(widget) || typeof widget.type !== "string") return false;
    const { properties, settings } = widget;
    if (!isObject(properties) || !isObject(settings)) return false;
    if (!isObject(properties.size) || !isFiniteNumber(properties.size.w) || !isFiniteNumber(properties.size.h)) return false;
    if (!isObject(properties.position) || !isFiniteNumber(properties.position.x) || !isFiniteNumber(properties.position.y)) return false;
    if (widget.type === "color") return hasStringSetting(widget, "color");
    if (widget.type === "webpage") return hasStringSetting(widget, "webpage");
    return true;
}

function normalizeV1(raw: Obj): ConfigV1 {
    const rawScreens = isObject(raw.screens) ? raw.screens : {};
    const screens: Record<string, ScreenV1> = {};

    for (const [screenId, screen] of Object.entries(rawScreens)) {
        if (!isObject(screen)) {
            console.warn(`Config: dropping screen "${screenId}", not an object`);
            continue;
        }
        const durationSeconds = Number(screen.durationSeconds);
        if (!Number.isFinite(durationSeconds) || !(durationSeconds > 0)) {
            console.warn(`Config: dropping screen "${screenId}", invalid durationSeconds`, screen.durationSeconds);
            continue;
        }

        const rawWidgets = isObject(screen.widgets) ? screen.widgets : {};
        const widgets: Record<string, WidgetV1> = {};
        for (const [widgetId, widget] of Object.entries(rawWidgets)) {
            if (isValidWidget(widget)) widgets[widgetId] = widget;
            else console.warn(`Config: dropping widget "${widgetId}" on screen "${screenId}", invalid shape`, widget);
        }

        const widgetOrder = [...new Set<string>((Array.isArray(screen.widgetOrder) ? screen.widgetOrder : [])
            .filter((id: unknown): id is string => typeof id === "string" && Object.hasOwn(widgets, id)))];

        screens[screenId] = { ...screen, durationSeconds, widgets, widgetOrder };
    }

    const screenOrder = (Array.isArray(raw.screenOrder) ? raw.screenOrder : [])
        .filter((id: unknown): id is string => {
            const valid = typeof id === "string" && Object.hasOwn(screens, id);
            if (!valid) console.warn(`Config: dropping unknown screen "${String(id)}" from screenOrder`);
            return valid;
        });

    return { ...raw, version: 1, screens, screenOrder };
}

export function normalizeConfig(raw: unknown): Config {
    if (!isObject(raw)) throw new Error("config.json is not a JSON object");

    switch (Number(raw.version)) {
        case 1:
            return normalizeV1(raw);
        default:
            reportError("Config", `Version ${raw.version} is not valid, trying fallback to v1`)
            return normalizeV1(raw);
    }
}
