<script lang="ts">
    import Widget from "./Widget.svelte";
    import type { ColorWidgetV1 } from "../types";

    const { widget }: { widget: ColorWidgetV1 } = $props();
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
