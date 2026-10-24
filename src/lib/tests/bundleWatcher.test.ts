import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { watchBundleHash } from "../bundleWatcher";
import { hardReload } from "../stability";

vi.mock("../stability", () => ({ hardReload: vi.fn() }));
beforeEach(() => { vi.stubEnv("VITE_POLL_TIMEOUT_SECONDS", "5"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("reloads when the bundle changes", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ bundle_hash: "a" }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ bundle_hash: "b" }) }));
    const stop = watchBundleHash();
    await vi.advanceTimersByTimeAsync(0);
    expect(hardReload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(hardReload).toHaveBeenCalledOnce();
    stop();
});

it("ignores a changed bundle received after cleanup", async () => {
    vi.useFakeTimers();
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ bundle_hash: "a" }) })
        .mockResolvedValueOnce({ ok: true, json: () => new Promise(r => { resolve = r; }) }));
    const stop = watchBundleHash();
    await vi.advanceTimersByTimeAsync(5000);
    stop();
    resolve({ bundle_hash: "b" });
    await vi.advanceTimersByTimeAsync(10000);
    expect(hardReload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
});
