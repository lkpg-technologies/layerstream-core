import { describe, expect, it } from "vitest";
import { getActiveScreenId, getLegacyPageIndex, getUpcomingScreenId, msUntilNextSecond } from "./schedule";

describe("getActiveScreenId", () => {
    const slots = [{ id: "a", durationSeconds: 10 }, { id: "b", durationSeconds: 5 }];

    it("switches exactly on slot boundaries", () => {
        expect(getActiveScreenId(slots, 0)).toBe("a");
        expect(getActiveScreenId(slots, 9_999)).toBe("a");
        expect(getActiveScreenId(slots, 10_000)).toBe("b");
        expect(getActiveScreenId(slots, 14_999)).toBe("b");
    });

    it("wraps around after a full cycle", () => {
        expect(getActiveScreenId(slots, 15_000)).toBe("a");
        expect(getActiveScreenId(slots, 15_000 * 1000 + 12_000)).toBe("b");
    });

    it("returns undefined when there is nothing to show", () => {
        expect(getActiveScreenId([], 0)).toBeUndefined();
        expect(getActiveScreenId([{ id: "a", durationSeconds: 0 }], 0)).toBeUndefined();
    });
});

describe("getUpcomingScreenId", () => {
    const slots = [{ id: "a", durationSeconds: 10 }, { id: "b", durationSeconds: 5 }];

    it("is undefined until the switch is close", () => {
        expect(getUpcomingScreenId(slots, 5_000, 0)).toBeUndefined();
        expect(getUpcomingScreenId(slots, 5_000, 4_999)).toBeUndefined();
    });

    it("names the next screen in order once the switch is close", () => {
        expect(getUpcomingScreenId(slots, 5_000, 5_000)).toBe("b");
        expect(getUpcomingScreenId(slots, 5_000, 9_999)).toBe("b");
        expect(getUpcomingScreenId(slots, 5_000, 12_000)).toBe("a");
    });

    it("never skips a screen shorter than the preload window", () => {
        const short = [{ id: "a", durationSeconds: 3 }, { id: "b", durationSeconds: 3 }, { id: "c", durationSeconds: 3 }];
        expect(getUpcomingScreenId(short, 5_000, 0)).toBe("b");
        expect(getUpcomingScreenId(short, 5_000, 3_500)).toBe("c");
        expect(getUpcomingScreenId(short, 5_000, 6_500)).toBe("a");
    });
});

describe("getLegacyPageIndex", () => {
    it("pins the first page when its duration is non-positive", () => {
        expect(getLegacyPageIndex([-1], 123_456)).toBe(0);
        expect(getLegacyPageIndex([0, 5], 123_456)).toBe(0);
    });

    it("rotates through pages", () => {
        expect(getLegacyPageIndex([5, 5], 2_000)).toBe(0);
        expect(getLegacyPageIndex([5, 5], 7_000)).toBe(1);
        expect(getLegacyPageIndex([5, 5], 12_000)).toBe(0);
    });

    it("ignores negative durations after the first page", () => {
        expect(getLegacyPageIndex([5, -10, 5], 7_000)).toBe(2);
    });

    it("returns undefined without pages", () => {
        expect(getLegacyPageIndex([], 0)).toBeUndefined();
    });
});

describe("msUntilNextSecond", () => {
    it("aligns to the next whole second", () => {
        expect(msUntilNextSecond(1_250)).toBe(750);
        expect(msUntilNextSecond(2_000)).toBe(1_000);
    });
});
