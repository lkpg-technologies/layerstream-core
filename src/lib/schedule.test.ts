import { describe, expect, it } from "vitest";
import { getActiveScreenId, getUpcomingScreenId, msUntilNextSecond } from "./schedule";

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

describe("msUntilNextSecond", () => {
    it("aligns to the next whole second", () => {
        expect(msUntilNextSecond(1_250)).toBe(750);
        expect(msUntilNextSecond(2_000)).toBe(1_000);
    });
});
