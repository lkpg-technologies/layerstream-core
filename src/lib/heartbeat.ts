import { getStatusSnapshot } from "./stability";

const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 5_000;

export function startHeartbeat(): () => void {
    let stopped = false;
    const requests = new Set<AbortController>();

    async function heartbeat() {
        const controller = new AbortController();
        requests.add(controller);
        const timeout = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);
        try {
            const response = await fetch(`${import.meta.env.VITE_MACHINE_CLIENT_API}/v1/heartbeat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    version: import.meta.env.VITE_CORE_VERSION?.trim() || "dev",
                    status: getStatusSnapshot(),
                }),
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Heartbeat failed: ${response.status}`);
        } catch (error) {
            if (!stopped) console.warn("Unable to send display heartbeat", error);
        } finally {
            clearTimeout(timeout);
            requests.delete(controller);
        }
    }

    void heartbeat();
    const timer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
        stopped = true;
        clearInterval(timer);
        requests.forEach(controller => controller.abort());
    };
}
