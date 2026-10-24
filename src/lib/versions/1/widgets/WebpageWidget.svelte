<script lang="ts">
    import { isOnline } from "../../../stores/network";
    import RefreshingIframe from "../../../RefreshingIframe.svelte";
    import Widget from "./Widget.svelte";
    import type { WebpageWidgetV1 } from "../types";

    const { widget }: { widget: WebpageWidgetV1 } = $props();
</script>

<Widget properties={widget.properties}>
    {#if !widget.settings.network?.value || $isOnline}
        <RefreshingIframe
            src={widget.settings.webpage?.value ?? ""}
            title={widget.settings.webpage?.value ?? "webpage"}
            style="position: absolute; width: 100%; height: 100%; left: 0; top: 0;"
        />
    {:else}
        <div class="fallback">
            <h1>{$isOnline === false ? "No network connection." : "Checking network connection…"}</h1>
        </div>
    {/if}
</Widget>

<style>
    .fallback {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        background: #333333;
        display: flex;
        justify-content: center;
        align-items: center;
        border: solid black 2px;
    }
    h1 {
        box-sizing: border-box;
        color: white;
        font-family: monospace;
        text-align: center;
    }
</style>
