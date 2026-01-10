<script lang="ts">
    import { tradingStore } from "$lib/stores/trading";
</script>

<div
    class="w-full max-w-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-2xl text-white"
>
    <div
        class="bg-slate-800/50 px-6 py-3 border-b border-slate-700 flex justify-between items-center"
    >
        <h3 class="font-bold text-sm uppercase tracking-wider">Positions</h3>
        <span class="text-xs font-mono text-slate-400"
            >Balance: ₹{$tradingStore.balance.toFixed(2)}</span
        >
    </div>

    {#if $tradingStore.positions.length === 0}
        <div class="p-8 text-center text-slate-500 italic">
            No open positions
        </div>
    {:else}
        <table class="w-full text-left text-sm">
            <thead class="bg-slate-800/30 text-slate-400 font-medium">
                <tr>
                    <th class="px-6 py-3">Symbol</th>
                    <th class="px-6 py-3 text-right">Qty</th>
                    <th class="px-6 py-3 text-right">Avg Price</th>
                    <th class="px-6 py-3 text-right">LTP</th>
                    <th class="px-6 py-3 text-right">P&L</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
                {#each $tradingStore.positions as position}
                    <tr class="hover:bg-slate-800/30 transition-colors">
                        <td class="px-6 py-3 font-semibold"
                            >{position.symbol}</td
                        >
                        <td class="px-6 py-3 text-right font-mono"
                            >{position.quantity}</td
                        >
                        <td
                            class="px-6 py-3 text-right font-mono text-slate-300"
                            >{position.avgPrice.toFixed(2)}</td
                        >
                        <td
                            class="px-6 py-3 text-right font-mono text-slate-300"
                            >{position.currentPrice.toFixed(2)}</td
                        >
                        <td
                            class={`px-6 py-3 text-right font-mono font-bold ${position.pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                            {position.pnl >= 0 ? "+" : ""}{position.pnl.toFixed(
                                2,
                            )}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>
