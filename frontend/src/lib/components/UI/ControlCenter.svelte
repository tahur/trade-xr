<script lang="ts">
    import { slide, scale, fade } from "svelte/transition";
    import { createEventDispatcher, onMount } from "svelte";
    import { quintOut } from "svelte/easing";

    // Stores
    import {
        isCameraEnabled,
        sensitivity,
        isTracking,
    } from "$lib/stores/tracking";
    import {
        gestureSensitivity,
        tradingHandPreference,
    } from "$lib/stores/gesture";

    const dispatch = createEventDispatcher<{
        connect: void;
    }>();

    // Props
    export let isLive: boolean = false;
    export let kiteState: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" =
        "NOT_CONFIGURED";
    export let loading: boolean = false;

    // View State
    type ViewState = "COMPACT" | "SETTINGS" | "API_CONFIG";
    let currentState: ViewState = "COMPACT";
    let containerElement: HTMLElement;

    // API Input Values
    let apiKey = "";
    let apiSecret = "";

    // Load stored keys on mount
    onMount(() => {
        apiKey = localStorage.getItem("kite_api_key") || "";
        apiSecret = localStorage.getItem("kite_api_secret") || "";
    });

    function toggleCamera() {
        isCameraEnabled.update((v) => !v);
    }

    function toggleSettings() {
        if (currentState === "SETTINGS") {
            currentState = "COMPACT";
        } else {
            currentState = "SETTINGS";
        }
    }

    function handleApiClick() {
        if (kiteState === "CONNECTED") return;

        // If configured, clicking the status pill should just connect
        if (kiteState === "CONFIGURED") {
            dispatch("connect");
            return;
        }

        // If not configured, open config
        if (currentState === "API_CONFIG") {
            currentState = "COMPACT";
        } else {
            currentState = "API_CONFIG";
        }
    }

    function saveAndConnect() {
        if (apiKey && apiSecret) {
            localStorage.setItem("kite_api_key", apiKey);
            localStorage.setItem("kite_api_secret", apiSecret);
            dispatch("connect");
            currentState = "COMPACT";
        }
    }

    // Helper for clicking outside to close
    function handleClickOutside(event: MouseEvent) {
        if (currentState === "COMPACT") return;
        if (
            containerElement &&
            !containerElement.contains(event.target as Node)
        ) {
            currentState = "COMPACT";
        }
    }

    // Colors based on content
    $: statusColorClass =
        kiteState === "CONNECTED"
            ? "text-emerald-400"
            : kiteState === "CONFIGURED"
              ? "text-cyan-400"
              : "text-orange-400";
    $: statusBgClass =
        kiteState === "CONNECTED"
            ? "bg-emerald-500/10 border-emerald-500/20"
            : kiteState === "CONFIGURED"
              ? "bg-cyan-500/10 border-cyan-500/20"
              : "bg-orange-500/10 border-orange-500/20";
</script>

<svelte:window on:click={handleClickOutside} />

<div
    bind:this={containerElement}
    class="fixed bottom-6 left-6 z-50 flex flex-col items-start transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
    class:w-[320px]={currentState !== "COMPACT"}
    class:w-auto={currentState === "COMPACT"}
>
    <!-- Main Glass Container -->
    <div
        class="relative overflow-hidden backdrop-blur-xl bg-[#0a0a0f]/80 border border-white/10 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style="border-radius: 24px;"
    >
        <!-- CONTENT: API CONFIG -->
        {#if currentState === "API_CONFIG"}
            <div class="p-5 w-[320px]" transition:slide|local>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-sm font-bold text-white tracking-wide">
                        API Configuration
                    </h3>
                    <button
                        class="text-white/40 hover:text-white"
                        on:click={() => (currentState = "COMPACT")}
                    >
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div class="space-y-3">
                    <div>
                        <label
                            class="block text-[10px] text-white/50 uppercase tracking-wider mb-1"
                            for="api_key">API Key</label
                        >
                        <input
                            id="api_key"
                            type="text"
                            bind:value={apiKey}
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-colors"
                            placeholder="Enter Kite API Key"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-[10px] text-white/50 uppercase tracking-wider mb-1"
                            for="api_secret">API Secret</label
                        >
                        <input
                            id="api_secret"
                            type="password"
                            bind:value={apiSecret}
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-colors"
                            placeholder="Enter Kite API Secret"
                        />
                    </div>

                    <button
                        class="w-full mt-2 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        on:click={saveAndConnect}
                        disabled={loading || !apiKey || !apiSecret}
                    >
                        {#if loading}
                            Connecting...
                        {:else}
                            Save & Connect
                        {/if}
                    </button>
                </div>
            </div>
        {/if}

        <!-- CONTENT: SETTINGS -->
        {#if currentState === "SETTINGS"}
            <div class="p-5 w-[320px]" transition:slide|local>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-sm font-bold text-white tracking-wide">
                        Control Settings
                    </h3>
                    <button
                        class="text-white/40 hover:text-white"
                        on:click={() => (currentState = "COMPACT")}
                    >
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div class="space-y-5">
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
                                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(139,92,246,0.5)]"
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
                                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.5)]"
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
                                on:click={() =>
                                    tradingHandPreference.set("Left")}
                                class="py-2 text-[10px] font-bold uppercase rounded-xl transition-all border
                                    {$tradingHandPreference === 'Left'
                                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}"
                            >
                                🤚 Left
                            </button>
                            <button
                                on:click={() =>
                                    tradingHandPreference.set("Right")}
                                class="py-2 text-[10px] font-bold uppercase rounded-xl transition-all border
                                    {$tradingHandPreference === 'Right'
                                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}"
                            >
                                Right ✋
                            </button>
                        </div>
                    </div>

                    <!-- Edit API Keys Button -->
                    <div class="pt-2 border-t border-white/5">
                        <button
                            class="w-full py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] uppercase tracking-wider font-medium rounded-xl transition-all"
                            on:click={() => (currentState = "API_CONFIG")}
                        >
                            Update API Keys
                        </button>
                    </div>
                </div>
            </div>
        {/if}

        <!-- COMPACT BAR -->
        {#if currentState === "COMPACT"}
            <div class="flex items-center gap-1 p-1.5" transition:fade|local>
                <!-- Camera Toggle -->
                <button
                    class="flex items-center gap-2 px-3 py-2 rounded-xl transition-all group {$isCameraEnabled
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:bg-white/5'} {$isCameraEnabled &&
                    isLive
                        ? 'bg-emerald-500/20'
                        : ''}"
                    on:click={toggleCamera}
                    title="Toggle Camera"
                >
                    <div class="relative">
                        {#if $isCameraEnabled}
                            <svg
                                class="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"
                                />
                            </svg>
                            <!-- Live Indicator Dot -->
                            {#if isLive}
                                <span
                                    class="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"
                                ></span>
                            {/if}
                        {:else}
                            <svg
                                class="w-4 h-4 text-white/40"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
                                />
                            </svg>
                        {/if}
                    </div>
                </button>

                <div class="w-px h-4 bg-white/10 mx-1"></div>

                <!-- API Status Pill -->
                <button
                    class="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all {statusBgClass}"
                    on:click={handleApiClick}
                >
                    {#if loading}
                        <svg
                            class="animate-spin w-3.5 h-3.5 text-white/50"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="4"
                            ></circle>
                            <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    {:else if kiteState === "CONNECTED"}
                        <img
                            src="/kite-logo.png"
                            alt="Kite"
                            class="w-4 h-4 object-contain opacity-80"
                        />
                    {:else if kiteState === "CONFIGURED"}
                        <svg
                            class="w-3.5 h-3.5 {statusColorClass}"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    {:else}
                        <svg
                            class="w-3.5 h-3.5 {statusColorClass}"
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
                    {/if}

                    <span
                        class="text-[10px] font-bold uppercase tracking-wide {statusColorClass}"
                    >
                        {loading
                            ? "..."
                            : kiteState === "CONNECTED"
                              ? "Connected"
                              : kiteState === "CONFIGURED"
                                ? "Connect"
                                : "Setup"}
                    </span>
                </button>

                <div class="w-px h-4 bg-white/10 mx-1"></div>

                <!-- Settings Toggle -->
                <button
                    class="flex items-center justify-center w-8 h-8 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
                    on:click={toggleSettings}
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
            </div>
        {/if}
    </div>
</div>

<style>
    /* Styling for glassmorphism and customization */
</style>
