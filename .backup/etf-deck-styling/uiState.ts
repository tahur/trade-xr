import { writable } from 'svelte/store';

export interface UIState {
    isDeckOpen: boolean;
}

export const uiState = writable<UIState>({
    isDeckOpen: false
});
