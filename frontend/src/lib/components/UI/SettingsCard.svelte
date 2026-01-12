<script lang="ts">
    import { slide } from "svelte/transition";
    import { sensitivity } from "$lib/stores/tracking";
    import {
        gestureSensitivity,
        tradingHandPreference,
    } from "$lib/stores/gesture";

    let showSettings = false;
</script>

<div class="relative z-50">
    <!-- Gear Icon Button (Glassmorphic Pill) -->
    <button
        class="flex items-center justify-center w-10 h-10 rounded-xl glass-panel text-slate-400 hover:text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-lg"
        on:click|stopPropagation={() => (showSettings = !showSettings)}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="w-5 h-5"
        >
            <path
                fill-rule="evenodd"
                d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                clip-rule="evenodd"
            />
        </svg>
    </button>

    <!-- Settings Dropdown -->
    {#if showSettings}
        <div
            class="absolute left-0 top-full mt-3 p-4 w-56 rounded-2xl glass-panel-dark backdrop-blur-xl z-50 text-left flex flex-col gap-4 shadow-2xl origin-top-left"
            transition:slide={{ duration: 250 }}
        >
            <!-- Header -->
            <div
                class="flex justify-between items-center border-b border-white/10 pb-2"
            >
                <span
                    class="text-xs font-bold text-slate-300 uppercase tracking-widest"
                    >Settings</span
                >
                <button
                    class="text-slate-500 hover:text-white"
                    on:click={() => (showSettings = false)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        class="w-4 h-4"
                    >
                        <path
                            d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
                        />
                    </svg>
                </button>
            </div>

            <!-- 1. Parallax -->
            <div>
                <div
                    class="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-2"
                >
                    <span>Parallax</span>
                    <span class="text-cyan-400">{$sensitivity}</span>
                </div>
                <!-- Custom Range Slider -->
                <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    bind:value={$sensitivity}
                    class="w-full h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                />
            </div>

            <!-- 2. Gesture -->
            <div>
                <div
                    class="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-2"
                >
                    <span>Gesture</span>
                    <span class="text-purple-400">{$gestureSensitivity}</span>
                </div>
                <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    bind:value={$gestureSensitivity}
                    class="w-full h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                />
            </div>

            <!-- 3. Hand Preference -->
            <div>
                <div
                    class="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-2"
                >
                    <span>Trading Hand</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button
                        on:click={() => tradingHandPreference.set("Left")}
                        class={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all border border-transparent ${$tradingHandPreference === "Left" ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "bg-slate-800/50 text-slate-500 hover:bg-slate-700"}`}
                    >
                        Left 🤚
                    </button>
                    <button
                        on:click={() => tradingHandPreference.set("Right")}
                        class={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all border border-transparent ${$tradingHandPreference === "Right" ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "bg-slate-800/50 text-slate-500 hover:bg-slate-700"}`}
                    >
                        ✋ Right
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Premium Glassmorphic Styles matching PriceCard vibes */
    .glass-panel {
        background: rgba(11, 28, 45, 0.6); /* Deep XR Blue */
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 229, 255, 0.2);
    }

    .glass-panel-dark {
        background: rgba(11, 28, 45, 0.95); /* Deep XR Blue Opaque */
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 229, 255, 0.1);
        box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    }
</style>
