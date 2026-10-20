<script lang="ts">
    import { isOnline  } from "../../stores/network.svelte";
    import { reportError } from "../../stability";
    import type { ScreenV1, WidgetV1 } from "./types";

    const { screen }: { screen: ScreenV1 } = $props();

    function boxStyle(widget: WidgetV1): string {
        const { size, position } = widget.properties;
        return `position: absolute; width: ${size.w}%; height: ${size.h}%; left: ${position.x}%; top: ${position.y}%;`;
    }
</script>
<div id="screen">
    {#each screen.widgetOrder as widgetId (widgetId)}
        {@const widget = screen.widgets[widgetId]}
        <!-- A broken widget renders nothing instead of taking down the screen -->
        <svelte:boundary onerror={(error) => reportError(`widget ${widgetId}`, error)}>
            {#if widget.type === "color"}
                <div style="{boxStyle(widget)} background: {widget.settings.color?.value};"></div>
            {:else if widget.type === "webpage"}
                {#if !widget.settings.network?.value || $isOnline}
                    <iframe
                        src={widget.settings.webpage?.value}
                        frameborder="0"
                        title={widget.settings.webpage?.value}
                        style={boxStyle(widget)}
                    ></iframe>
                {:else}
                    <div
                        style="
                            {boxStyle(widget)}
                            background: #333333;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            border: solid black 2px;
                        "
                    >
                        <h1
                            style="color: white; font-family: monospace; text-align: center;"
                        >No network connection.
                        </h1>
                    </div>
                {/if}
            {/if}
        </svelte:boundary>
    {/each}
</div>


<style>
    * {
        box-sizing: border-box;
    }
    #screen {
        position: absolute;
        height: 100%;
        width: 100%;
        top: 0;
        left: 0;
    }
</style>
