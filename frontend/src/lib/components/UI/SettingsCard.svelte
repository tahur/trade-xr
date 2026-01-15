<script lang="ts">
    import { slide, scale } from "svelte/transition";
    import { sensitivity } from "$lib/stores/tracking";
    import {
        gestureSensitivity,
        tradingHandPreference,
    } from "$lib/stores/gesture";

    import ApiKeyModal from "./ApiKeyModal.svelte";

    let showSettings = false;
    let showApiModal = false;
</script>

<div class="relative z-50">
    <!-- Settings Toggle Button -->
    <button
        aria-label="Toggle settings"
        class="flex items-center justify-center w-10 h-10 rounded-xl backdrop-blur-xl
            bg-gradient-to-br from-white/10 to-violet-500/5 border border-white/15
            text-white/60 hover:text-white hover:border-white/25 hover:scale-105
            active:scale-95 transition-all shadow-lg"
        on:click|stopPropagation={() => (showSettings = !showSettings)}
    >
        <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
        </svg>
    </button>

    <!-- Settings Panel -->
    {#if showSettings}
        <div
            class="absolute left-0 top-full mt-3 w-64 rounded-2xl backdrop-blur-2xl overflow-hidden
                bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95
                border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]"
            transition:scale={{ duration: 200, start: 0.9 }}
        >
            <!-- Header -->
            <div
                class="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-white/5"
            >
                <span
                    class="text-xs font-bold text-white/80 uppercase tracking-widest"
                    >Settings</span
                >
                <button
                    aria-label="Close settings"
                    class="text-white/40 hover:text-white transition-colors"
                    on:click={() => (showSettings = false)}
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div class="p-4 flex flex-col gap-5">
                <!-- Parallax Slider -->
                <div>
                    <div
                        class="flex justify-between text-[10px] text-white/50 uppercase tracking-wider mb-2"
                    >
                        <span>Parallax Intensity</span>
                        <span class="text-violet-400 font-bold"
                            >{$sensitivity}</span
                        >
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.5"
                        bind:value={$sensitivity}
                        class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500
                            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(139,92,246,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                </div>

                <!-- Gesture Sensitivity Slider -->
                <div>
                    <div
                        class="flex justify-between text-[10px] text-white/50 uppercase tracking-wider mb-2"
                    >
                        <span>Gesture Sensitivity</span>
                        <span class="text-emerald-400 font-bold"
                            >{$gestureSensitivity.toFixed(2)}</span
                        >
                    </div>
                    <input
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        bind:value={$gestureSensitivity}
                        class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500
                            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                </div>

                <!-- Hand Preference -->
                <div>
                    <div
                        class="text-[10px] text-white/50 uppercase tracking-wider mb-2"
                    >
                        Preferred Hand
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button
                            on:click={() => tradingHandPreference.set("Left")}
                            class="py-2.5 text-[10px] font-bold uppercase rounded-xl transition-all border
                                {$tradingHandPreference === 'Left'
                                ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}"
                        >
                            🤚 Left
                        </button>
                        <button
                            on:click={() => tradingHandPreference.set("Right")}
                            class="py-2.5 text-[10px] font-bold uppercase rounded-xl transition-all border
                                {$tradingHandPreference === 'Right'
                                ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}"
                        >
                            Right ✋
                        </button>
                    </div>
                </div>

                <!-- API Configuration -->
                <div class="pt-3 border-t border-white/10">
                    <button
                        class="w-full py-3 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 hover:from-violet-500/30 hover:to-cyan-500/30
                            text-xs text-white/80 font-bold uppercase tracking-wider rounded-xl transition-all
                            border border-white/10 flex items-center justify-center gap-2"
                        on:click={() => {
                            showSettings = false;
                            showApiModal = true;
                        }}
                    >
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                            />
                        </svg>
                        Configure API Keys
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<!-- API Key Modal -->
<ApiKeyModal isOpen={showApiModal} on:close={() => (showApiModal = false)} />
