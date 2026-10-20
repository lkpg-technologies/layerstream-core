import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeConfig } from "./configValidation";
import type { ConfigV1 } from "./versions/1/types";
import type { LegacyConfig } from "./versions/legacy/types/Config";

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

    describe("legacy", () => {
        it("keeps the original example config intact", () => {
            const page = {
                bgColor: "white",
                type: "fullscreen",
                duration: -1,
                layout: { content: { type: "url", src: "https://example.com", id: "url1" } },
            };
            const config = normalizeConfig({ networkRequired: true, pages: [page] }) as LegacyConfig;

            expect(config.networkRequired).toBe(true);
            expect(config.pages).toEqual([page]);
        });

        it("drops pages that would crash rendering", () => {
            const config = normalizeConfig({
                pages: [
                    { type: "grid", duration: 5, layout: { template: [] } },
                    { type: "grid", duration: 5, layout: { template: [["a"]], content: [] } },
                    { type: "fullscreen", duration: "abc", layout: { content: {} } },
                    { type: "fullscreen", duration: "5", layout: {} },
                ],
            }) as LegacyConfig;

            expect(config.pages).toHaveLength(1);
            expect(config.pages[0].type).toBe("grid");
        });

        it("treats a missing pages array as empty", () => {
            expect((normalizeConfig({}) as LegacyConfig).pages).toEqual([]);
        });
    });
});
