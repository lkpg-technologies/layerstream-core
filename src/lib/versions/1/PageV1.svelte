<script lang="ts">
    import ImageWidget from "./widgets/ImageWidget.svelte";
    import VideoWidget from "./widgets/VideoWidget.svelte";
    import ColorWidget from "./widgets/ColorWidget.svelte";
    import WebpageWidget from "./widgets/WebpageWidget.svelte";
    import type { ScreenV1 } from "./types";
    import { logError } from "../../util/utils";

    const { screen, active = true, playbackKey = 0, onvideofinish }: { screen: ScreenV1, active?: boolean, playbackKey?: number, onvideofinish?: (widgetId: string, played: boolean) => void } = $props();
</script>
<div class="screen">
    {#each screen.widgetOrder as widgetId (widgetId)}
        {@const widget = screen.widgets[widgetId]}
        <!-- A broken widget renders nothing instead of taking down the screen -->
        <svelte:boundary onerror={(error) => logError(`widget ${widgetId}`, error)}>
            {#if widget.type === "color"}
                <ColorWidget {widget} />
            {:else if widget.type === "webpage"}
                <WebpageWidget {widget} />
            {:else if widget.type === "image"}
                <ImageWidget {widget} />
            {:else if widget.type === "video"}
                <VideoWidget {widget} {active} {playbackKey} waitForEnd={screen.playbackMode === "video-end"}
                    onfinish={(played) => onvideofinish?.(widgetId, played)} />
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
