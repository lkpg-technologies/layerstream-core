export function resolvePath(path: string) {
    // if "http://" or "https://" exists in string return path, else return symlink-folder prepended to path
    return /^(https?:)?\/\//.test(path) ? path : `${import.meta.env.VITE_SYMLINK_NAME ?? "current"}/${path}`;
}
  