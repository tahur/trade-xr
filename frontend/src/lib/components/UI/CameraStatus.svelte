<script lang="ts">
    import {
        isTracking,
        cameraLabel,
        isCameraEnabled,
    } from "$lib/stores/tracking";
    import { fade } from "svelte/transition";
</script>

{#if ($isCameraEnabled && $isTracking) || !$isCameraEnabled}
    <div
        class="flex items-center gap-2 px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-emerald-500/10 w-fit mt-1 pointer-events-auto"
        transition:fade={{ duration: 300 }}
    >
        <!-- Toggle Button -->
        <button
            class="flex items-center justify-center h-4 w-4 rounded-full transition-colors hover:bg-white/10"
            on:click={() => ($isCameraEnabled = !$isCameraEnabled)}
            title={$isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class={`w-3 h-3 ${$isCameraEnabled ? "text-emerald-400" : "text-red-400"}`}
            >
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
        </button>

        {#if $isCameraEnabled}
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
        {:else}
            <!-- Red Dot (Static) -->
            <div class="relative flex h-1.5 w-1.5">
                <span
                    class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"
                ></span>
            </div>
            <span
                class="text-[9px] font-bold text-red-400/90 tracking-widest uppercase leading-none"
            >
                CAM OFF
            </span>
        {/if}
    </div>
{/if}
