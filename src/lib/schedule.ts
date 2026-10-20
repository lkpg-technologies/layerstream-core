// Screen rotation is derived from wall-clock time, so all displays sharing a
// config show the same screen at the same moment

export function msUntilNextSecond(now = Date.now()): number {
    return 1000 - (now % 1000);
}

export function getActiveScreenId(
    slots: { id: string; durationSeconds: number }[],
    now = Date.now(),
): string | undefined {
    const cycleMs = slots.reduce((sum, slot) => sum + slot.durationSeconds * 1000, 0);
    if (!(cycleMs > 0)) return undefined;

    const position = now % cycleMs;
    let cursor = 0;
    for (const slot of slots) {
        cursor += slot.durationSeconds * 1000;
        if (position < cursor) return slot.id;
    }
    return undefined;
}

export function getLegacyPageIndex(durations: number[], now = Date.now()): number | undefined {
    if (durations.length === 0) return undefined;

    // A non-positive duration on the first page pins it permanently
    if (durations[0] <= 0) return 0;

    const durationsMs = durations.map(d => Math.max(0, d) * 1000);
    const cycleMs = durationsMs.reduce((sum, d) => sum + d, 0);
    if (!(cycleMs > 0)) return 0;

    const position = now % cycleMs;
    let cursor = 0;
    for (let i = 0; i < durationsMs.length; i++) {
        cursor += durationsMs[i];
        if (position < cursor) return i;
    }
    return undefined;
}
