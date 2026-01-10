<script lang="ts">
    import { gestureState } from "$lib/stores/gesture";
    import { fade, scale, fly } from "svelte/transition";
</script>

{#if $gestureState.isHandDetected}
    <div
        class="absolute inset-0 pointer-events-none flex items-center justify-center z-40"
    >
        <!-- Active Order Card -->
        {#if $gestureState.mode === "CONFIRMING"}
            <div
                class="relative bg-slate-900/90 border border-slate-600 backdrop-blur-xl rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 w-64"
                transition:scale={{ duration: 200 }}
            >
                <!-- Header -->
                <div
                    class="w-full flex justify-between items-center text-xs uppercase tracking-wider text-slate-400"
                >
                    <span>Limit Order</span>
                    <span class="text-green-400 font-bold">BUY</span>
                </div>

                <!-- Price Display -->
                <div class="text-center">
                    <span class="text-sm text-slate-500 mr-1">₹</span>
                    <span
                        class="text-4xl font-mono font-bold text-white tracking-tighter"
                    >
                        {$gestureState.targetPrice?.toFixed(2)}
                    </span>
                </div>

                <!-- Progress Indicator -->
                <div
                    class="w-full h-1 bg-slate-700 rounded-full overflow-hidden mt-2"
                >
                    <div
                        class="h-full bg-green-500 transition-all duration-75 ease-linear"
                        style="width: {$gestureState.holdProgress}%"
                    ></div>
                </div>

                <p
                    class="text-[10px] text-slate-500 uppercase tracking-widest mt-1"
                >
                    Hold Steady to Confirm
                </p>
            </div>
        {/if}

        <!-- Success Toast -->
        {#if $gestureState.mode === "PLACED"}
            <div
                class="bg-green-500 text-black font-bold px-8 py-4 rounded-full shadow-[0_0_50px_rgba(34,197,94,0.5)] flex items-center gap-3 transform scale-110"
                transition:fly={{ y: 20, duration: 300 }}
            >
                <span class="text-xl">✓</span>
                <div class="flex flex-col leading-none">
                    <span class="text-xs uppercase opacity-75"
                        >Order Placed</span
                    >
                    <span class="text-lg"
                        >₹{$gestureState.targetPrice?.toFixed(2)}</span
                    >
                </div>
            </div>
        {/if}
    </div>
{/if}
