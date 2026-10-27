import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function setup(attempts = "0") {
    vi.resetModules();
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = { getItem: vi.fn(() => attempts), setItem: vi.fn(), removeItem: vi.fn() };
    const location = { pathname: "/", href: "" };
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("window", { location, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    return { ...await import("../util/stability"), storage, location };
}

// A persistent fault can leave the display waiting for recovery when the healthy-uptime timer fires.
// Resetting attempts during that wait would erase backoff and make repeated failures cause more frequent disruptive reloads.
it("does not reset backoff while waiting for recovery", async () => {
    const s = await setup("5");
    const stop = s.installGlobalErrorHandlers();
    s.scheduleRecoveryReload("failure");
    await vi.advanceTimersByTimeAsync(600000);
    expect(s.storage.removeItem).not.toHaveBeenCalled();
    expect(s.storage.setItem).toHaveBeenCalledWith("layerstream:recoveryReloads", "6");
    expect(s.location.href).toContain("?v=");
    stop();
});

// Error handlers may be torn down while a recovery reload is pending, then recovery may be needed again.
// A stale timer would interrupt playback after cleanup; stale scheduling state could prevent recovery from the next failure.
it("cancels recovery on cleanup and allows scheduling again", async () => {
    const s = await setup();
    const stop = s.installGlobalErrorHandlers();
    s.scheduleRecoveryReload("failure");
    stop();
    await vi.advanceTimersByTimeAsync(600000);
    expect(s.location.href).toBe("");
    s.scheduleRecoveryReload("next failure");
    await vi.advanceTimersByTimeAsync(30000);
    expect(s.location.href).toContain("?v=");
});

// A display can run successfully after several earlier recovery attempts.
// Keeping the old backoff indefinitely would make a later unrelated failure take unnecessarily long to recover from.
it("resets backoff after healthy uptime", async () => {
    const s = await setup("3");
    const stop = s.installGlobalErrorHandlers();
    await vi.advanceTimersByTimeAsync(600000);
    expect(s.storage.removeItem).toHaveBeenCalledOnce();
    stop();
});
