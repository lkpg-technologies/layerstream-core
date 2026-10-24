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

it("resets backoff after healthy uptime", async () => {
    const s = await setup("3");
    const stop = s.installGlobalErrorHandlers();
    await vi.advanceTimersByTimeAsync(600000);
    expect(s.storage.removeItem).toHaveBeenCalledOnce();
    stop();
});
