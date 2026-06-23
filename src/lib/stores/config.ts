// src/lib/stores/config.ts
import { derived, writable } from "svelte/store";
import type { Config } from "../types/Config";
import { resolvePath } from "../utils";

export const config = writable<Config>();

export const pages = derived(config, ($config) => $config?.pages ?? []);

export async function loadConfig() {
  try {
    const res = await fetch(resolvePath("config.json"));
    const jsonconfig: Config = await res.json();
    config.set(jsonconfig);
  } catch(err) {
    console.error("Error reading config", err);
  }
}
