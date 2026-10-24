// Error reporting and recovery reloads 

export function reportError(source: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${source}]`, error);
}

export function hardReload(reason: string) {
    console.warn(`Reloading: ${reason}`);
    window.location.href = window.location.pathname + "?v=" + Date.now();
}

// Recovery reloads back off exponentially (tracked across reloads in sessionStorage)
// so a persistent fault can't put the display in a tight reload loop
const RECOVERY_KEY = "layerstream:recoveryReloads";
const RECOVERY_BASE_DELAY_MS = 30_000;
const RECOVERY_MAX_DELAY_MS = 10 * 60_000;
const HEALTHY_AFTER_MS = 10 * 60_000;

function readRecoveryAttempts(): number {
    try {
        const attempts = Number(sessionStorage.getItem(RECOVERY_KEY));
        return Number.isSafeInteger(attempts) ? attempts : 0;
    } catch {
        return 0;
    }
}

function writeRecoveryAttempts(attempts: number) {
    try {
        if (attempts > 0) sessionStorage.setItem(RECOVERY_KEY, String(attempts));
        else sessionStorage.removeItem(RECOVERY_KEY);
    } catch {
        // Storage unavailable, backoff just won't persist across reloads
    }
}

let recoveryTimer: ReturnType<typeof setTimeout> | undefined;

export function scheduleRecoveryReload(reason: string) {
    if (recoveryTimer !== undefined) return;
    const attempts = readRecoveryAttempts();
    const delay = Math.min(RECOVERY_BASE_DELAY_MS * 2 ** attempts, RECOVERY_MAX_DELAY_MS);
    console.warn(`Scheduling recovery reload in ${delay / 1000}s: ${reason}`);
    recoveryTimer = setTimeout(() => {
        writeRecoveryAttempts(attempts + 1);
        hardReload(reason);
    }, delay);
}

// Many uncaught errors in a short window means the app is likely wedged
const ERROR_WINDOW_MS = 5 * 60_000;
const ERROR_THRESHOLD = 10;

export function installGlobalErrorHandlers(): () => void {
    let recentErrors: number[] = [];

    function record(source: string, error: unknown) {
        reportError(source, error);
        const now = Date.now();
        recentErrors = recentErrors.filter(t => now - t < ERROR_WINDOW_MS);
        recentErrors.push(now);
        if (recentErrors.length >= ERROR_THRESHOLD) {
            scheduleRecoveryReload(`${recentErrors.length} uncaught errors in ${ERROR_WINDOW_MS / 60_000} minutes`);
        }
    }

    const onError = (event: ErrorEvent) => record("uncaught", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => record("unhandled rejection", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Waiting for a recovery reload does not count as healthy uptime.
    const healthyTimer = setTimeout(() => {
        if (recoveryTimer === undefined) writeRecoveryAttempts(0);
    }, HEALTHY_AFTER_MS);

    return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        clearTimeout(healthyTimer);
        clearTimeout(recoveryTimer);
        recoveryTimer = undefined;
    };
}
