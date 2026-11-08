<script lang="ts">
    import Widget from "./Widget.svelte";
    import type { ImageWidgetV1 } from "../types";
    import { resolvePath } from "../../../util/utils";

    const { widget }: { widget: ImageWidgetV1 } = $props();
</script>

<Widget properties={widget.properties}>
    <img src={resolvePath(widget.settings.src.value)} alt="" style:object-fit={widget.settings.fit?.value ?? "contain"} />
</Widget>

<style>
    img {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>
