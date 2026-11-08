<script lang="ts">
    import Widget from "./Widget.svelte";
    import type { VideoWidgetV1 } from "../types";
    import { logError, resolvePath } from "../../../util/utils";

    const { widget, active = true }: { widget: VideoWidgetV1, active?: boolean } = $props();
    let video: HTMLVideoElement | undefined = $state();
    const src = $derived(resolvePath(widget.settings.src.value));

    $effect(() => {
        // Restart when the source changes or a preloaded screen becomes active.
        src;
        const element = video;
        if (!element) return;
        if (active) {
            element.currentTime = 0;
            void element.play().catch(error => {
                if (error.name !== "AbortError") logError("video playback", error);
            });
        } else {
            element.pause();
        }
        return () => element.pause();
    });
</script>

<Widget properties={widget.properties}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} {src} preload="auto" playsinline
        loop={widget.settings.loop?.value ?? true}
        muted={widget.settings.muted?.value ?? true}
        style:object-fit={widget.settings.fit?.value ?? "contain"}
    ></video>
</Widget>

<style>
    video {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>
