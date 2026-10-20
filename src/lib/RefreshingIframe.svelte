<script lang="ts">
    import { onMount } from "svelte";
    import { isOnline } from "./stores/network";

    // No allow-top-navigation: embedded pages must never be able to navigate the display away from the app.
    // No allow-popups: a popup would cover the kiosk.
    const IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms";

    const { src, title, style, refreshSeconds }: {
        src: string,
        title: string,
        style?: string,
        refreshSeconds?: number
    } = $props();

    // A failed cross-origin load can't be detected from here, so recover by
    // remounting: periodically if configured, and whenever the network comes back
    let generation = $state(0);

    onMount(() => {
        const seconds = Number(refreshSeconds);
        const refreshTimer = seconds > 0 ? setInterval(() => generation++, seconds * 1000) : undefined;

        let wasOffline = false;
        const unsubscribe = isOnline.subscribe(online => {
            if (online && wasOffline) generation++;
            wasOffline = online === false;
        });

        return () => {
            clearInterval(refreshTimer);
            unsubscribe();
        };
    });
</script>

{#key generation}
    <iframe {src} {title} {style} frameborder="0" sandbox={IFRAME_SANDBOX}></iframe>
{/key}
