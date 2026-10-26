export type Obj = Record<string, any>;

export function resolvePath(path: string) {
    // if "http://" or "https://" exists in string return path, else return symlink-folder prepended to path
    return /^(https?:)?\/\//.test(path) ? path : `${import.meta.env.VITE_SYMLINK_NAME ?? "current"}/${path}`;
}

export function logError(source: string, error: unknown) {
    console.error(`[${source}]`, error);
}

export function hardReload(reason: string) {
    console.warn(`Reloading: ${reason}`);
    window.location.href = window.location.pathname + "?v=" + Date.now();
}

export function isObject(value: unknown): value is Obj {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): boolean {
    return typeof value === "number" && Number.isFinite(value);
}

export function hasStringSetting(widget: Obj, key: string): boolean {
    return isObject(widget.settings[key]) && typeof widget.settings[key].value === "string";
}
