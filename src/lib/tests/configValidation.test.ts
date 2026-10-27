import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeConfig } from "../util/configValidation";
import type { ConfigV1 } from "../versions/1/types";

const webpageWidget = {
    type: "webpage",
    properties: { size: { w: 100, h: 100 }, position: { x: 0, y: 0 } },
    settings: { webpage: { value: "https://example.com" } },
};

beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("normalizeConfig", () => {
    // A config response can contain a scalar, null, or an array instead of the expected object.
    // Accepting it as configuration could hide a bad response and pass unusable data into playback instead of triggering load retry.
    it("rejects anything that isn't an object", () => {
        expect(() => normalizeConfig("nope")).toThrow();
        expect(() => normalizeConfig(null)).toThrow();
        expect(() => normalizeConfig([])).toThrow();
    });

    describe("v1", () => {
        // A playlist can contain an infinite duration, duplicate widget references, and intentionally repeated screens.
        // Infinite timing can stall rotation, duplicate widgets can break keyed rendering, and removing repeated screens changes intended airtime.
        it("drops infinite durations and deduplicates widget keys while preserving repeated screens", () => {
            const config = normalizeConfig({
                version: 1,
                screenOrder: ["valid", "valid", "invalid"],
                screens: {
                    valid: { id: "valid", durationSeconds: 10, widgets: { w: webpageWidget }, widgetOrder: ["w", "w"] },
                    invalid: { id: "invalid", durationSeconds: "Infinity" },
                },
            }) as ConfigV1;
            expect(config.screenOrder).toEqual(["valid", "valid"]);
            expect(config.screens.valid.widgetOrder).toEqual(["w"]);
            expect(config.screens.invalid).toBeUndefined();
        });

        // A valid screen ID can also be the name of an inherited JavaScript object property.
        // Confusing the screen with that property could discard valid content or break lookup and playback order.
        it("preserves IDs that match object prototype properties", () => {
            const ids = ["constructor", "toString", "hasOwnProperty"];
            const config = normalizeConfig({
                version: 1,
                screenOrder: ids,
                screens: Object.fromEntries(ids.map(id => [id, { id, durationSeconds: 10 }])),
            }) as ConfigV1;
            expect(config.screenOrder).toEqual(ids);
            for (const id of ids) {
                expect(Object.hasOwn(config.screens, id)).toBe(true);
                expect(config.screens[id].id).toBe(id);
            }
        });

        // A malformed screen can have an ID that is absent, invalid, or points to a different record.
        // Keeping it could make the scheduler and renderer disagree about which content to show; warnings identify the rejected entries.
        it("drops screens with missing, non-string, or mismatched IDs", () => {
            const config = normalizeConfig({
                version: 1,
                screenOrder: ["valid", "missing", "numeric", "mismatched"],
                screens: {
                    valid: { id: "valid", durationSeconds: 10 },
                    missing: { durationSeconds: 10 },
                    numeric: { id: 42, durationSeconds: 10 },
                    mismatched: { id: "valid", durationSeconds: 10 },
                },
            }) as ConfigV1;

            expect(config.screenOrder).toEqual(["valid"]);
            expect(Object.keys(config.screens)).toEqual(["valid"]);
            expect(config.screens.valid.id).toBe("valid");
            for (const [id, value] of [["missing", undefined], ["numeric", 42], ["mismatched", "valid"]]) {
                expect(console.warn).toHaveBeenCalledWith(
                    `Config: dropping screen "${id}", id must match its record key`,
                    value,
                );
            }
        });

        // A configuration producer may serialize the version number as a string.
        // Leaving it as a string would break numeric version dispatch even though the configuration describes a supported format.
        it("accepts version as a string", () => {
            expect(normalizeConfig({ version: "1" }).version).toBe(1);
        });

        // A config can mix numeric duration strings with malformed entries and references to missing content.
        // Rejecting usable durations loses content, while retaining broken entries can disrupt timing or rendering for the valid remainder.
        it("coerces durations and drops invalid screens and widgets", () => {
            const config = normalizeConfig({
                version: 1,
                screenOrder: ["s1", "missing", "zero", 42],
                screens: {
                    s1: {
                        id: "s1",
                        durationSeconds: "10",
                        widgetOrder: ["w1", "broken", "unknown"],
                        widgets: { w1: webpageWidget, broken: { type: "color", settings: {} } },
                    },
                    zero: { id: "zero", durationSeconds: 0, widgets: {} },
                    notAnObject: "x",
                },
            }) as ConfigV1;

            expect(config.screenOrder).toEqual(["s1"]);
            expect(Object.keys(config.screens)).toEqual(["s1"]);
            expect(config.screens.s1.durationSeconds).toBe(10);
            expect(config.screens.s1.widgetOrder).toEqual(["w1"]);
        });

        // A widget can arrive with dimensions encoded as strings instead of numeric geometry.
        // Allowing it into playback violates the renderer's geometry contract and risks incorrectly sized or positioned content.
        it("rejects widgets with non-numeric geometry", () => {
            const config = normalizeConfig({
                version: 1,
                screenOrder: ["s1"],
                screens: {
                    s1: {
                        id: "s1",
                        durationSeconds: 5,
                        widgetOrder: ["w1"],
                        widgets: { w1: { ...webpageWidget, properties: { size: { w: "100", h: 100 }, position: { x: 0, y: 0 } } } },
                    },
                },
            }) as ConfigV1;

            expect(config.screens.s1.widgetOrder).toEqual([]);
        });

        // A new or incomplete configuration may contain no screens or playback order yet.
        // Missing collection defaults would make consumers fail when iterating or looking up content instead of handling an empty playlist.
        it("survives missing screens and screenOrder", () => {
            const config = normalizeConfig({ version: 1 }) as ConfigV1;
            expect(config.screenOrder).toEqual([]);
            expect(config.screens).toEqual({});
        });
    });
});
