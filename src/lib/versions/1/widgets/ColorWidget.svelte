<script lang="ts">
    import Widget from "./Widget.svelte";
    import type { WidgetV1 } from "../types";

    const { widget }: { widget: WidgetV1 } = $props();
</script>

<Widget properties={widget.properties}>
    <div class="color" style:background-color={widget.settings.color?.value}></div>
</Widget>

<style>
    .color {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
    }
</style>
