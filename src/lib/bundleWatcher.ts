import { hardReload } from "./stability";

const DEFAULT_POLL_SECONDS = 5;
const REQUEST_TIMEOUT_MS = 5_000;

function pollIntervalMs(): number {
    const seconds = Number(import.meta.env.VITE_POLL_TIMEOUT_SECONDS);
    // Guards against "", "0" or garbage turning into a tight polling loop
    return (Number.isFinite(seconds) && seconds >= 1 ? seconds : DEFAULT_POLL_SECONDS) * 1000;
}

/** Polls the machine client and reloads the page when the active bundle changes. */
export function watchBundleHash(): () => void {
    const interval = pollIntervalMs();
    let currentHash: string | undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function poll() {
        if (stopped) return;
        const request = new AbortController();
        controller = request;
        const timeout = setTimeout(() => request.abort(), REQUEST_TIMEOUT_MS);
        try {
            const res = await fetch(`${import.meta.env.VITE_MACHINE_CLIENT_API}/v1/bundles/current/hash`, {
                cache: "no-store",
                signal: request.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const hash = (await res.json())?.bundle_hash;
            if (stopped) return;
            // Only a well-formed hash may trigger a reload, never an error body
            if (typeof hash !== "string" || hash === "") throw new Error("Response has no bundle_hash");

            if (currentHash === undefined) {
                currentHash = hash;
            } else if (hash !== currentHash) {
                stopped = true;
                hardReload(`bundle changed ${currentHash} -> ${hash}`);
                return;
            }
        } catch (error) {
            if (!stopped) console.warn("Unable to check bundle hash", error);
        } finally {
            clearTimeout(timeout);
            // Scheduled after completion so slow requests never overlap
            if (!stopped) timer = setTimeout(poll, interval);
        }
    }

    void poll();
    return () => {
        stopped = true;
        clearTimeout(timer);
        controller?.abort();
    };
}
