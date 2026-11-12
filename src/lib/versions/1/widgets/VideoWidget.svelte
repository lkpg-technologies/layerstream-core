<script lang="ts">
    import Widget from "./Widget.svelte";
    import type { VideoWidgetV1 } from "../types";
    import { logError, resolvePath } from "../../../util/utils";

    const { widget, active = true, waitForEnd = false, playbackKey = 0, onfinish }: { widget: VideoWidgetV1, active?: boolean, waitForEnd?: boolean, playbackKey?: number, onfinish?: (played: boolean) => void } = $props();
    let video: HTMLVideoElement | undefined = $state();
    const src = $derived(resolvePath(widget.settings.src.value));

    let completed = false;
    const NO_PROGRESS_TIMEOUT_MS = 30_000;
    const END_GRACE_MS = 5_000;

    function finish(played: boolean): void {
        if (!active || completed) return;
        completed = true;
        onfinish?.(played);
    }

    function play(element: HTMLVideoElement): void {
        void element.play().catch(error => {
            if (error.name !== "AbortError") {
                logError("video playback", error);
                finish(false);
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
        finish(true);
    }

    $effect(() => {
        // Restart when the source changes or a preloaded screen becomes active.
        src;
        playbackKey;
        const element = video;
        if (!element) return;
        completed = false;
        if (active) {
            // Clear a previous media error so a mounted video can retry loading.
            if (element.error) element.load();
            element.currentTime = 0;
            play(element);
        } else {
            element.pause();
        }
        // Bound initial loading and mid-playback stalls, not total running time.
        // Only advancing playback resets the deadline; waiting/stalled events
        // (or repeated timeupdate events at the same position) cannot extend it.
        let timer: ReturnType<typeof setInterval> | undefined;
        if (active && waitForEnd) {
            let lastTime = element.currentTime;
            const startedAt = performance.now();
            let lastProgressAt = startedAt;
            timer = setInterval(() => {
                if (completed) { clearInterval(timer); return; }
                const now = performance.now();
                if (element.currentTime > lastTime) {
                    lastProgressAt = now;
                }
                lastTime = element.currentTime;
                const idleMs = now - lastProgressAt;
                // Metadata estimates when this video's first playthrough should
                // finish. Progress always takes precedence over that estimate.
                // The scheduler waits for every video, including the longest.
                const duration = element.duration;
                const rate = element.playbackRate;
                const expectedEnd = Number.isFinite(duration) && duration > 0 && rate > 0
                    ? startedAt + duration / rate * 1000 : Infinity;
                const overdue = now >= expectedEnd + END_GRACE_MS;
                if (idleMs >= NO_PROGRESS_TIMEOUT_MS || (overdue && idleMs >= END_GRACE_MS)) {
                    clearInterval(timer);
                    element.pause();
                    logError("video playback", new Error("Video timed out without playback progress"));
                    finish(false);
                }
            }, 1_000);
        }
        return () => {
            clearInterval(timer);
            element.pause();
        };
    });
</script>

<Widget properties={widget.properties}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} {src} preload="auto" playsinline
        loop={!waitForEnd && (widget.settings.loop?.value ?? true)}
        onended={ended}
        onerror={() => finish(false)}
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
