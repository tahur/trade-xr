<script lang="ts">
    import { isTracking, cameraLabel } from "$lib/stores/tracking";
    import { fade } from "svelte/transition";
</script>

{#if $isTracking}
    <div
        class="flex items-center gap-2 px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-emerald-500/10 w-fit mt-1"
        transition:fade={{ duration: 300 }}
    >
        <!-- Blinking Dot -->
        <div class="relative flex h-1.5 w-1.5">
            <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
            ></span>
            <span
                class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"
            ></span>
        </div>

        <!-- Text Info -->
        <div class="flex items-baseline gap-1.5">
            <span
                class="text-[9px] font-bold text-emerald-400/90 tracking-widest uppercase leading-none"
            >
                CAM ON
            </span>
            {#if $cameraLabel}
                <span
                    class="text-[9px] font-mono text-slate-500 leading-none lowercase opacity-60"
                >
                    {$cameraLabel}
                </span>
            {/if}
        </div>
    </div>
{/if}
