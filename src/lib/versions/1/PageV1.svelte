<script lang="ts">
    import { reportError } from "../../stability";
    import ColorWidget from "./widgets/ColorWidget.svelte";
    import WebpageWidget from "./widgets/WebpageWidget.svelte";
    import type { ScreenV1 } from "./types";

    const { screen }: { screen: ScreenV1 } = $props();
</script>
<div class="screen">
    {#each screen.widgetOrder as widgetId (widgetId)}
        {@const widget = screen.widgets[widgetId]}
        <!-- A broken widget renders nothing instead of taking down the screen -->
        <svelte:boundary onerror={(error) => reportError(`widget ${widgetId}`, error)}>
            {#if widget.type === "color"}
                <ColorWidget {widget} />
            {:else if widget.type === "webpage"}
                <WebpageWidget {widget} />
            {/if}
        </svelte:boundary>
    {/each}
</div>


<style>
    .screen {
        box-sizing: border-box;
        position: absolute;
        height: 100%;
        width: 100%;
        top: 0;
        left: 0;
    }
</style>
