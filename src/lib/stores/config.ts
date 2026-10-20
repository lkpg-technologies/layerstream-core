// src/lib/stores/config.ts
import { writable } from "svelte/store";
import type { Config } from "../types/Config";
import { resolvePath } from "../utils";
import { normalizeConfig } from "../configValidation";
import { displayStatus, reportError } from "../stability";

const _config = writable<Config | undefined>(undefined);
export const config = { subscribe: _config.subscribe };

const FETCH_TIMEOUT_MS = 10_000;
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;

/** Loads config.json, retrying with backoff until it succeeds. Returns a function cancelling pending retries. */
export function loadConfig(): () => void {
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  async function attempt(retries: number) {
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), FETCH_TIMEOUT_MS);
    try {
      // no-store so a bundle swap is never masked by a cached config
      const res = await fetch(resolvePath("config.json"), { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const loaded = normalizeConfig(await res.json());
      if (stopped) return;

      displayStatus.configLoaded = true;
      displayStatus.configVersion = loaded.version === 1 ? 1 : "legacy";
      console.info(`Version: ${displayStatus.configVersion === 1 ? 1 : "Legacy"}`);
      _config.set(loaded);
    } catch (err) {
      if (stopped) return;
      reportError("config", err);
      const delay = Math.min(RETRY_BASE_MS * 2 ** retries, RETRY_MAX_MS);
      retryTimer = setTimeout(() => attempt(retries + 1), delay);
    } finally {
      clearTimeout(timeout);
    }
  }

  void attempt(0);
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    controller?.abort();
  };
}
