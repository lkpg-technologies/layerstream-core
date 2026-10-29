import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "svelte/server";
import { writable } from "svelte/store";
import PageV1 from "../versions/1/PageV1.svelte";
import WebpageWidget from "../versions/1/widgets/WebpageWidget.svelte";
import type { WebpageWidgetV1, WidgetV1 } from "../versions/1/types";

vi.mock("../stores/network", () => ({
    isOnline: writable<boolean | undefined>(undefined),
}));

import { isOnline } from "../stores/network";
const network = isOnline as ReturnType<typeof writable<boolean | undefined>>;

const widget: WebpageWidgetV1 = {
    type: "webpage",
    properties: { size: { w: 40, h: 30 }, position: { x: 15, y: 25 } },
    settings: { webpage: { value: "https://example.com" } },
};

beforeEach(() => network.set(undefined));

describe("webpage network behavior", () => {
    for (const required of [undefined, false, true]) {
        for (const online of [undefined, false, true]) {
            // At startup or during an outage, connectivity may be unknown or offline, and widgets may or may not require it.
            // Incorrect gating would hide usable content or embed unavailable pages instead of showing the correct connection message.
            // When an iframe is rendered, its URL, title, and sandbox attributes must retain the expected markup contract.
            it(`renders with network required=${required}, online=${online}`, () => {
                network.set(online);
                const { body } = render(WebpageWidget, {
                    props: {
                        widget: {
                            ...widget,
                            settings: {
                                ...widget.settings,
                                ...(required === undefined ? {} : { network: { value: required } }),
                            },
                        },
                    },
                });
                if (!required || online) {
                    expect(body).toContain('<iframe');
                    expect(body).toContain('src="https://example.com"');
                    expect(body).toContain('title="https://example.com"');
                    expect(body).toContain('sandbox="allow-scripts allow-same-origin allow-forms"');
                    expect(body).not.toContain("network connection");
                } else {
                    expect(body).not.toContain('<iframe');
                    expect(body).toContain(online === false
                        ? "No network connection."
                        : "Checking network connection…");
                }
            });
        }
    }

    // The webpage component may be rendered directly with no webpage setting.
    // Losing its fallback attributes would change the empty-source behavior and leave the frame without its default descriptive title.
    it("keeps the empty URL and title defaults", () => {
        const { body } = render(WebpageWidget, {
            props: { widget: { ...widget, settings: {} } },
        });
        expect(body).toContain('src=""');
        expect(body).toContain('title="webpage"');
    });
});

// Layouts must retain relative sizing and stacking across display sizes, even when an unsupported widget type is present.
// Wrong geometry or order could obscure content; rendering an unknown type as a supported one could show unintended content.
it("preserves percentage geometry, widget order, and unsupported-type behavior", () => {
    const { body } = render(PageV1, {
        props: {
            screen: {
                id: "screen",
                name: "Screen",
                durationSeconds: 10,
                widgetOrder: ["color", "unknown", "web"],
                widgets: {
                    web: widget,
                    color: { ...widget, type: "color", settings: { color: { value: "#123456" } } },
                    // @ts-expect-error Deliberately exercise unsupported widget data at runtime.
                    unknown: { ...widget, type: "unsupported", settings: { color: { value: "#abcdef" } } },
                },
            },
        },
    });
    expect(body).toContain("width: 40%");
    expect(body).toContain("height: 30%");
    expect(body).toContain("left: 15%");
    expect(body).toContain("top: 25%");
    expect(body.indexOf("#123456")).toBeLessThan(body.indexOf("<iframe"));
    expect(body).not.toContain("#abcdef");
});
