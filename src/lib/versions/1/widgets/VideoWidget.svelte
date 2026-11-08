<script lang="ts">
    import { untrack } from "svelte";
    import Widget from "./Widget.svelte";
    import type { VideoWidgetV1 } from "../types";
    import { logError, resolvePath } from "../../../util/utils";

    const { widget, active = true, waitForEnd = false, playbackKey = 0, onfinish }: { widget: VideoWidgetV1, active?: boolean, waitForEnd?: boolean, playbackKey?: number, onfinish?: (played: boolean) => void } = $props();
    let video: HTMLVideoElement | undefined = $state();
    const src = $derived(resolvePath(widget.settings.src.value));

    let completed = false;

    function play(element: HTMLVideoElement): void {
        void element.play().catch(error => {
            if (error.name !== "AbortError") {
                logError("video playback", error);
                if (active) onfinish?.(false);
            }
        });
    }

    function ended(): void {
        if (!active || !video) return;
        // Native looping suppresses ended events. Loop manually in video-end
        // mode so the scheduler can count each video's first full playthrough.
        if (waitForEnd && (widget.settings.loop?.value ?? true)) {
            video.currentTime = 0;
            play(video);
        }
        if (!completed) {
            completed = true;
            onfinish?.(true);
        }
    }

    $effect(() => {
        // Restart when the source changes or a preloaded screen becomes active.
        src;
        playbackKey;
        const element = video;
        if (!element) return;
        completed = false;
        if (active) {
            if (waitForEnd && element.error) { untrack(() => onfinish?.(false)); return; }
            element.currentTime = 0;
            play(element);
        } else {
            element.pause();
        }
        return () => element.pause();
    });
</script>

<Widget properties={widget.properties}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} {src} preload="auto" playsinline
        loop={!waitForEnd && (widget.settings.loop?.value ?? true)}
        onended={ended}
        onerror={() => { if (active) onfinish?.(false); }}
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
