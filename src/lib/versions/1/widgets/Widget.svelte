<script lang="ts">
    import type { Snippet } from "svelte";
    import type { WidgetV1 } from "../types";

    const { properties, children }: {
        properties: WidgetV1["properties"],
        children: Snippet
    } = $props();
</script>

<div
    class="widget"
    style:width="{properties.size.w}%"
    style:height="{properties.size.h}%"
    style:left="{properties.position.x}%"
    style:top="{properties.position.y}%"
>
    {@render children()}
</div>

<style>
    .widget {
        position: absolute;
        box-sizing: border-box;
    }
</style>
