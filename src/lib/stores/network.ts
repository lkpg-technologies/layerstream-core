import { readable } from "svelte/store";

const PING_URL = import.meta.env.VITE_NETWORK_CHECK_URL || "https://www.gstatic.com/generate_204";
const CHECK_INTERVAL_MS = 5_000;
const CHECK_TIMEOUT_MS = 4_000;
// A single failed ping is usually a blip, not an outage
const FAILURES_BEFORE_OFFLINE = 3;

/**
 * `undefined` until the first check settles. Treat that as "probably online"
 * when deciding whether to show content, and as "not yet online" when waiting
 * for a confirmed connection. Checks only run while something is subscribed.
 */
export const isOnline = readable<boolean | undefined>(undefined, set => {
    let failures = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function check() {
        clearTimeout(timer);
        controller?.abort();
        const current = controller = new AbortController();
        const timeout = setTimeout(() => current.abort(), CHECK_TIMEOUT_MS);
        try {
            await fetch(PING_URL, { mode: "no-cors", cache: "no-store", signal: current.signal });
            failures = 0;
            set(true);
        } catch {
            // Aborted by a newer check, which owns the state now
            if (current !== controller) return;
            failures++;
            if (failures >= FAILURES_BEFORE_OFFLINE) set(false);
        } finally {
            clearTimeout(timeout);
            if (!stopped && current === controller) timer = setTimeout(check, CHECK_INTERVAL_MS);
        }
    }

    // The browser knows for certain when the link is down, react immediately
    const onOffline = () => {
        failures = FAILURES_BEFORE_OFFLINE;
        set(false);
    };
    const onOnline = () => void check();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    if (!navigator.onLine) onOffline();
    void check();

    return () => {
        stopped = true;
        clearTimeout(timer);
        controller?.abort();
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
    };
});
