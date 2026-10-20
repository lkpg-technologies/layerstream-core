import { readable } from "svelte/store";

const PING_URL = import.meta.env.VITE_NETWORK_CHECK_URL || "https://www.gstatic.com/generate_204";
const CHECK_INTERVAL_MS = 5_000;
const CHECK_TIMEOUT_MS = 4_000;
// A single failed ping is usually a blip, not an outage
const FAILURES_BEFORE_OFFLINE = 3;

// `undefined` until a check succeeds, three checks fail, or the browser reports offline.
export const isOnline = readable<boolean | undefined>(undefined, set => {
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    function cancelCheck() {
        clearTimeout(timer);
        const previous = controller;
        controller = undefined;
        previous?.abort();
    }

    function scheduleCheck() {
        clearTimeout(timer);
        timer = setTimeout(check, CHECK_INTERVAL_MS);
    }

    async function check() {
        cancelCheck();
        const current = new AbortController();
        controller = current;
        const timeout = setTimeout(() => current.abort(), CHECK_TIMEOUT_MS);
        try {
            await fetch(PING_URL, { mode: "no-cors", cache: "no-store", signal: current.signal });
            if (current !== controller) return;
            failures = 0;
            set(true);
        } catch {
            // Timeouts count as failures; cancelled or superseded checks do not.
            if (current !== controller) return;
            failures++;
            if (failures >= FAILURES_BEFORE_OFFLINE) set(false);
        } finally {
            clearTimeout(timeout);
            if (current === controller) {
                cancelCheck();
                scheduleCheck();
            }
        }
    }

    // The browser knows for certain when the link is down, react immediately
    const onOffline = () => {
        cancelCheck();
        failures = FAILURES_BEFORE_OFFLINE;
        set(false);
        scheduleCheck();
    };
    const onOnline = () => void check();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    if (!navigator.onLine) onOffline();
    void check();

    return () => {
        cancelCheck();
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
    };
});
