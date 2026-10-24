import { describe, expect, it } from "vitest";
import { getActiveScreenId, getUpcomingScreenId, msUntilNextSecond } from "../schedule";

import type { ScreenV1 } from "../versions/1/types";

function screen(id: string, durationSeconds: number): ScreenV1 {
    return { id, name: id, durationSeconds, widgets: {}, widgetOrder: [] };
}

describe("getActiveScreenId", () => {
    const screens = [screen("a", 10), screen("b", 5)];

    it("switches exactly on screen boundaries", () => {
        expect(getActiveScreenId(screens, 0)).toBe("a");
        expect(getActiveScreenId(screens, 9_999)).toBe("a");
        expect(getActiveScreenId(screens, 10_000)).toBe("b");
        expect(getActiveScreenId(screens, 14_999)).toBe("b");
    });

    it("wraps around after a full cycle", () => {
        expect(getActiveScreenId(screens, 15_000)).toBe("a");
        expect(getActiveScreenId(screens, 15_000 * 1000 + 12_000)).toBe("b");
    });

    it("preserves repeated screens in playback order", () => {
        const a = screen("a", 10);
        const screens = [a, screen("b", 5), a];
        expect(getActiveScreenId(screens, 15_000)).toBe("a");
        expect(getUpcomingScreenId(screens, 5_000, 20_000)).toBe("a");
        expect(getActiveScreenId(screens, 25_000)).toBe("a");
        expect(getActiveScreenId(screens, 35_000)).toBe("b");
    });

    it("returns undefined when there is nothing to show", () => {
        expect(getActiveScreenId([], 0)).toBeUndefined();
        expect(getActiveScreenId([screen("a", 0)], 0)).toBeUndefined();
    });
});

describe("getUpcomingScreenId", () => {
    const screens = [screen("a", 10), screen("b", 5)];

    it("is undefined until the switch is close", () => {
        expect(getUpcomingScreenId(screens, 5_000, 0)).toBeUndefined();
        expect(getUpcomingScreenId(screens, 5_000, 4_999)).toBeUndefined();
    });

    it("names the next screen in order once the switch is close", () => {
        expect(getUpcomingScreenId(screens, 5_000, 5_000)).toBe("b");
        expect(getUpcomingScreenId(screens, 5_000, 9_999)).toBe("b");
        expect(getUpcomingScreenId(screens, 5_000, 12_000)).toBe("a");
    });

    it("never skips a screen shorter than the preload window", () => {
        const short = [screen("a", 3), screen("b", 3), screen("c", 3)];
        expect(getUpcomingScreenId(short, 5_000, 0)).toBe("b");
        expect(getUpcomingScreenId(short, 5_000, 3_500)).toBe("c");
        expect(getUpcomingScreenId(short, 5_000, 6_500)).toBe("a");
    });
});

describe("msUntilNextSecond", () => {
    it("aligns to the next whole second", () => {
        expect(msUntilNextSecond(1_250)).toBe(750);
        expect(msUntilNextSecond(2_000)).toBe(1_000);
    });
});
