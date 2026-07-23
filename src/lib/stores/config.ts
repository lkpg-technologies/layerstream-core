// src/lib/stores/config.ts
import { derived, get, writable } from "svelte/store";
import type { Config } from "../types/Config";
import { resolvePath } from "../utils";

const _config = writable<Config>();
export const config = derived(_config, () => get(_config))

export async function loadConfig() {
  try {
    const res = await fetch(resolvePath("config.json"));
    const jsonconfig: Config = await res.json();
    _config.set(jsonconfig);
  } catch(err) {
    console.error("Error reading config", err);
  }
}
