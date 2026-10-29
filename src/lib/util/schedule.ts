import type { ScreenV1 } from "../versions/1/types";

// Screen rotation is derived from wall-clock time, so all displays sharing a
// config show the same screen at the same moment

export function msUntilNextSecond(now = Date.now()): number {
    return 1000 - (now % 1000);
}

/** The active screen's index and how long until the rotation moves on from it. */
export function getScreenTiming(screens: ScreenV1[], now = Date.now()): { index: number; msRemaining: number } | undefined {
    const cycleMs = screens.reduce((sum, screen) => sum + screen.durationSeconds * 1000, 0);
    if (!(cycleMs > 0)) return undefined;

    const position = now % cycleMs;
    let cursor = 0;
    for (let index = 0; index < screens.length; index++) {
        cursor += screens[index].durationSeconds * 1000;
        if (position < cursor) return { index, msRemaining: cursor - position };
    }
    return undefined;
}

export function getActiveScreenId(screens: ScreenV1[], now = Date.now()): string | undefined {
    const timing = getScreenTiming(screens, now);
    return timing && screens[timing.index].id;
}

/** The screen following the active one in the rotation, once the switch is at most `withinMs` away. */
export function getUpcomingScreenId(screens: ScreenV1[], withinMs: number, now = Date.now()): string | undefined {
    const timing = getScreenTiming(screens, now);
    if (!timing || timing.msRemaining > withinMs) return undefined;
    return screens[(timing.index + 1) % screens.length].id;
}