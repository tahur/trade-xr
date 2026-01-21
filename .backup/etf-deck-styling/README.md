# ETF Deck Styling Backup

Saved on: 2026-01-20

## New Components (untracked)
- `ETFDeck.svelte` - Gesture-controlled isometric ETF card deck
- `IsometricCard.svelte` - 3D glassmorphism card component
- `uiState.ts` - UI state store for zen mode (isDeckOpen)

## Modified Files (diffs from last commit)
- `+page.svelte.modified` - ETFSelector → ETFDeck swap, zen mode fade
- `PriceTargetOverlay.svelte.modified` - isDeckOpen blocking
- `etfService.ts.modified` - Mock data fallback for API failures

## To Restore
Copy the files back to their original locations and import into +page.svelte.
