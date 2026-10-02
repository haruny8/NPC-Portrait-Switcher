export function createSceneState() {
    return {
        sceneNPCs: new Map(),
        activeEntryIdx: null,
        pinnedEntryIdx: null,
    };
}

export function reorderSceneNPCs(state, entries) {
    const sceneStates = [...state.sceneNPCs.values()];
    const activeState = state.activeEntryIdx === null ? null : state.sceneNPCs.get(state.activeEntryIdx);
    const pinnedState = state.pinnedEntryIdx === null ? null : state.sceneNPCs.get(state.pinnedEntryIdx);
    const stateByEntry = new Map(sceneStates.map(npcState => [npcState.entry, npcState]));
    const newIndexByState = new Map();

    state.sceneNPCs.clear();
    for (const [entryIdx, entry] of entries.entries()) {
        const npcState = stateByEntry.get(entry);
        if (!npcState) continue;
        npcState.entryIdx = entryIdx;
        state.sceneNPCs.set(entryIdx, npcState);
        newIndexByState.set(npcState, entryIdx);
    }

    state.activeEntryIdx = newIndexByState.get(activeState) ?? null;
    state.pinnedEntryIdx = newIndexByState.get(pinnedState) ?? null;
}

export function clearScene(state) {
    state.sceneNPCs.clear();
    state.activeEntryIdx = null;
    state.pinnedEntryIdx = null;
}