import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeConfig } from "./configValidation";
import type { ConfigV1 } from "./versions/1/types";

const webpageWidget = {
    type: "webpage",
    properties: { size: { w: 100, h: 100 }, position: { x: 0, y: 0 } },
    settings: { webpage: { value: "https://example.com" } },
};

beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("normalizeConfig", () => {
    it("rejects anything that isn't an object", () => {
        expect(() => normalizeConfig("nope")).toThrow();
        expect(() => normalizeConfig(null)).toThrow();
        expect(() => normalizeConfig([])).toThrow();
    });

    describe("v1", () => {
        it("drops infinite durations and deduplicates widget keys while preserving repeated screens", () => {
            const config = normalizeConfig({
                version: 1,
                screenOrder: ["valid", "valid", "invalid"],
                screens: {
                    valid: { durationSeconds: 10, widgets: { w: webpageWidget }, widgetOrder: ["w", "w"] },
                    invalid: { durationSeconds: "Infinity" },
                },
            }) as ConfigV1;
            expect(config.screenOrder).toEqual(["valid", "valid"]);
            expect(config.screens.valid.widgetOrder).toEqual(["w"]);
            expect(config.screens.invalid).toBeUndefined();
        });

        it("preserves IDs that match object prototype properties", () => {
            const config = normalizeConfig(JSON.parse('{"version":1,"screenOrder":["__proto__"],"screens":{"__proto__":{"durationSeconds":10}}}')) as ConfigV1;
            expect(config.screenOrder).toEqual(["__proto__"]);
            expect(Object.hasOwn(config.screens, "__proto__")).toBe(true);
        });

        it("accepts version as a string", () => {
            expect(normalizeConfig({ version: "1" }).version).toBe(1);
        });

        it("coerces durations and drops invalid screens and widgets", () => {
            const config = normalizeConfig({
                version: 1,
                screenOrder: ["s1", "missing", "zero", 42],
                screens: {
                    s1: {
                        durationSeconds: "10",
                        widgetOrder: ["w1", "broken", "unknown"],
                        widgets: { w1: webpageWidget, broken: { type: "color", settings: {} } },
                    },
                    zero: { durationSeconds: 0, widgets: {} },
                    notAnObject: "x",
                },
            }) as ConfigV1;

            expect(config.screenOrder).toEqual(["s1"]);
            expect(Object.keys(config.screens)).toEqual(["s1"]);
            expect(config.screens.s1.durationSeconds).toBe(10);
            expect(config.screens.s1.widgetOrder).toEqual(["w1"]);
        });

        it("rejects widgets with non-numeric geometry", () => {
            const config = normalizeConfig({
                version: 1,
                screenOrder: ["s1"],
                screens: {
                    s1: {
                        durationSeconds: 5,
                        widgetOrder: ["w1"],
                        widgets: { w1: { ...webpageWidget, properties: { size: { w: "100", h: 100 }, position: { x: 0, y: 0 } } } },
                    },
                },
            }) as ConfigV1;

            expect(config.screens.s1.widgetOrder).toEqual([]);
        });

        it("survives missing screens and screenOrder", () => {
            const config = normalizeConfig({ version: 1 }) as ConfigV1;
            expect(config.screenOrder).toEqual([]);
            expect(config.screens).toEqual({});
        });
    });
});
