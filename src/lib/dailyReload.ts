import { hardReload } from "./stability";

const DEFAULT_RELOAD_TIME = "03:00";
const CHECK_INTERVAL_MS = 30_000;

/** Parses "HH:MM". Returns null for "off" or anything invalid, which disables the daily reload. */
export function parseReloadTime(value = DEFAULT_RELOAD_TIME): { hours: number, minutes: number } | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return { hours, minutes };
}

/** Timestamp of the next occurrence of the given local time, strictly after `now`. */
export function nextReloadAt(time: { hours: number, minutes: number }, now = new Date()): number {
    const target = new Date(now);
    target.setHours(time.hours, time.minutes, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target.getTime();
}

/** Reloads once a day to clear memory slowly leaked by the browser and embedded pages. */
export function scheduleDailyReload(): () => void {
    const raw = import.meta.env.VITE_DAILY_RELOAD_TIME;
    const time = parseReloadTime(raw);
    if (!time) {
        if (raw !== "off") console.warn(`Daily reload disabled, invalid VITE_DAILY_RELOAD_TIME "${raw}"`);
        return () => {};
    }

    const reloadAt = nextReloadAt(time);
    // Polled rather than one long setTimeout so clock corrections and suspends can't skip it
    const timer = setInterval(() => {
        if (Date.now() >= reloadAt) {
            clearInterval(timer);
            hardReload("daily reload");
        }
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
}
