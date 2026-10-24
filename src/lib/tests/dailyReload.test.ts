import { describe, expect, it } from "vitest";
import { nextReloadAt, parseReloadTime } from "../util/dailyReload";

describe("parseReloadTime", () => {
    it("parses HH:MM", () => {
        expect(parseReloadTime("03:00")).toEqual({ hours: 3, minutes: 0 });
        expect(parseReloadTime("3:30")).toEqual({ hours: 3, minutes: 30 });
        expect(parseReloadTime(" 23:59 ")).toEqual({ hours: 23, minutes: 59 });
    });

    it("defaults to 03:00", () => {
        expect(parseReloadTime(undefined)).toEqual({ hours: 3, minutes: 0 });
    });

    it("disables on off or invalid input", () => {
        expect(parseReloadTime("off")).toBeNull();
        expect(parseReloadTime("")).toBeNull();
        expect(parseReloadTime("24:00")).toBeNull();
        expect(parseReloadTime("12:60")).toBeNull();
        expect(parseReloadTime("noon")).toBeNull();
    });
});

describe("nextReloadAt", () => {
    const at = (h: number, m: number, s = 0) => new Date(2026, 9, 20, h, m, s);

    it("picks later today when the time hasn't passed", () => {
        expect(nextReloadAt({ hours: 3, minutes: 0 }, at(1, 0))).toBe(at(3, 0).getTime());
    });

    it("picks tomorrow when the time has passed or is now", () => {
        const tomorrow = new Date(2026, 9, 21, 3, 0).getTime();
        expect(nextReloadAt({ hours: 3, minutes: 0 }, at(3, 0))).toBe(tomorrow);
        expect(nextReloadAt({ hours: 3, minutes: 0 }, at(3, 0, 10))).toBe(tomorrow);
        expect(nextReloadAt({ hours: 3, minutes: 0 }, at(14, 0))).toBe(tomorrow);
    });
});
