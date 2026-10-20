// Screen rotation is derived from wall-clock time, so all displays sharing a
// config show the same screen at the same moment

export function msUntilNextSecond(now = Date.now()): number {
    return 1000 - (now % 1000);
}

type Slot = { id: string; durationSeconds: number };

/** The active slot's index and how long until the rotation moves on from it. */
export function getScreenTiming(slots: Slot[], now = Date.now()): { index: number; msRemaining: number } | undefined {
    const cycleMs = slots.reduce((sum, slot) => sum + slot.durationSeconds * 1000, 0);
    if (!(cycleMs > 0)) return undefined;

    const position = now % cycleMs;
    let cursor = 0;
    for (let index = 0; index < slots.length; index++) {
        cursor += slots[index].durationSeconds * 1000;
        if (position < cursor) return { index, msRemaining: cursor - position };
    }
    return undefined;
}

export function getActiveScreenId(slots: Slot[], now = Date.now()): string | undefined {
    const timing = getScreenTiming(slots, now);
    return timing && slots[timing.index].id;
}

/** The screen following the active one in the rotation, once the switch is at most `withinMs` away. */
export function getUpcomingScreenId(slots: Slot[], withinMs: number, now = Date.now()): string | undefined {
    const timing = getScreenTiming(slots, now);
    if (!timing || timing.msRemaining > withinMs) return undefined;
    return slots[(timing.index + 1) % slots.length].id;
}