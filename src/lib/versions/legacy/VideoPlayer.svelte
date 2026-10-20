<script lang="ts">
    import { onMount } from "svelte";
    import { reportError } from "../../stability";

    const RETRY_DELAY_MS = 10_000;
    const WATCHDOG_INTERVAL_MS = 15_000;

    const { src, active = true }: { src: string, active?: boolean } = $props();

    let video: HTMLVideoElement;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function play() {
        // Rejections here (e.g. interrupted by pause) are expected, the watchdog covers real failures
        video.play().catch(() => {});
    }

    function scheduleReload(reason: string) {
        if (retryTimer !== undefined) return;
        reportError("video", `${reason}: ${src}`);
        retryTimer = setTimeout(() => {
            retryTimer = undefined;
            video.load();
            if (active) play();
        }, RETRY_DELAY_MS);
    }

    // Hidden pages stay mounted in legacy mode, so don't spend CPU decoding video nobody sees
    $effect(() => {
        if (active) play();
        else video.pause();
    });

    onMount(() => {
        // Catches stalls and decoder hangs that never fire an error event
        let lastTime = -1;
        const watchdog = setInterval(() => {
            if (!active || retryTimer !== undefined) {
                lastTime = -1;
                return;
            }
            if (video.currentTime === lastTime) scheduleReload("playback stalled");
            lastTime = video.currentTime;
        }, WATCHDOG_INTERVAL_MS);

        return () => {
            clearInterval(watchdog);
            clearTimeout(retryTimer);
        };
    });
</script>

<video bind:this={video} {src} loop muted playsinline onerror={() => scheduleReload("error")}>
    <track kind="captions">
</video>
