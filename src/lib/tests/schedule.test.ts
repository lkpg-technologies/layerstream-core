import { describe, expect, it } from "vitest";
import { getActiveScreenId, getUpcomingScreenId, msUntilNextSecond } from "../util/schedule";

import type { ScreenV1 } from "../versions/1/types";

function screen(id: string, durationSeconds: number): ScreenV1 {
    return { id, name: id, durationSeconds, widgets: {}, widgetOrder: [] };
}

describe("getActiveScreenId", () => {
    const screens = [screen("a", 10), screen("b", 5)];

    // When a scheduled slot ends, displays must select the next screen at the same boundary.
    // An off-by-one error would show the wrong content at the handover.
    it("switches exactly on screen boundaries", () => {
        expect(getActiveScreenId(screens, 0)).toBe("a");
        expect(getActiveScreenId(screens, 9_999)).toBe("a");
        expect(getActiveScreenId(screens, 10_000)).toBe("b");
        expect(getActiveScreenId(screens, 14_999)).toBe("b");
    });

    // Displays repeat their playlists continuously, including long after startup.
    // Incorrect wraparound could select the wrong screen or leave playback with nothing to show.
    it("wraps around after a full cycle", () => {
        expect(getActiveScreenId(screens, 15_000)).toBe("a");
        expect(getActiveScreenId(screens, 15_000 * 1000 + 12_000)).toBe("b");
    });

    // A playlist may intentionally repeat a screen to give it more airtime.
    // Collapsing those entries would change slot timing and which screen is selected for preloading.
    it("preserves repeated screens in playback order", () => {
        const a = screen("a", 10);
        const screens = [a, screen("b", 5), a];
        expect(getActiveScreenId(screens, 15_000)).toBe("a");
        expect(getUpcomingScreenId(screens, 5_000, 20_000)).toBe("a");
        expect(getActiveScreenId(screens, 25_000)).toBe("a");
        expect(getActiveScreenId(screens, 35_000)).toBe("b");
    });

    // An empty playlist or one with no positive cycle duration has no active screen.
    // Returning an ID would tell the renderer to show content without a valid playback slot.
    it("returns undefined when there is nothing to show", () => {
        expect(getActiveScreenId([], 0)).toBeUndefined();
        expect(getActiveScreenId([screen("a", 0)], 0)).toBeUndefined();
    });
});

describe("getUpcomingScreenId", () => {
    const screens = [screen("a", 10), screen("b", 5)];

    // While the next transition is still far away, the upcoming screen should not be mounted.
    // Preloading too early would keep extra embedded pages consuming resources unnecessarily.
    it("is undefined until the switch is close", () => {
        expect(getUpcomingScreenId(screens, 5_000, 0)).toBeUndefined();
        expect(getUpcomingScreenId(screens, 5_000, 4_999)).toBeUndefined();
    });

    // Near a transition, including the end of the playlist, the renderer needs the next screen to preload.
    // Selecting it late or choosing the wrong ID can leave the intended content unprepared when shown.
    it("names the next screen in order once the switch is close", () => {
        expect(getUpcomingScreenId(screens, 5_000, 5_000)).toBe("b");
        expect(getUpcomingScreenId(screens, 5_000, 9_999)).toBe("b");
        expect(getUpcomingScreenId(screens, 5_000, 12_000)).toBe("a");
    });

    // A screen may last less than the five-second preload window.
    // Looking ahead by that whole window could preload a later screen and leave the immediate successor unprepared.
    it("never skips a screen shorter than the preload window", () => {
        const short = [screen("a", 3), screen("b", 3), screen("c", 3)];
        expect(getUpcomingScreenId(short, 5_000, 0)).toBe("b");
        expect(getUpcomingScreenId(short, 5_000, 3_500)).toBe("c");
        expect(getUpcomingScreenId(short, 5_000, 6_500)).toBe("a");
    });
});

describe("msUntilNextSecond", () => {
    // Displays can start their scheduler between whole seconds or exactly on a second boundary.
    // Incorrect delays would offset update timing or cause immediate repeated ticks at an exact boundary.
    it("aligns to the next whole second", () => {
        expect(msUntilNextSecond(1_250)).toBe(750);
        expect(msUntilNextSecond(2_000)).toBe(1_000);
    });
});
