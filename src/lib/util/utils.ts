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