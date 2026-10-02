import { cropImage, compressImage, readFileAsDataUrl } from './media/images.js';
import { splitKeywords } from './matching/keywords.js';
import { createSettingsStore } from './settings/store.js';
import { clearScene, createSceneState, reorderSceneNPCs } from './scene/state.js';
import { getLatestUserAndAssistantMessages, scanAndUpdateScene } from './scene/scanner.js';
import { createPortraitPanel } from './ui/portrait-panel.js';
import { createSettingsPanel } from './ui/settings-panel.js';
import { createTrayController } from './ui/tray.js';

export function start(getContext = () => SillyTavern.getContext()) {
    const state = createSceneState();
    const settingsStore = createSettingsStore(getContext);
    let portraitPanel;
    let trayController;
    let settingsPanel;

    function clearAllPortraits() {
        clearScene(state);
        portraitPanel.close();
        trayController.render();
        portraitPanel.updateNavLabel();
    }

    function switchActiveNPC(entryIdx, { open = true } = {}) {
        portraitPanel.showActiveNPC(entryIdx, { open });
        trayController.render();
    }

    function handleEntriesReordered() {
        reorderSceneNPCs(state, settingsStore.getSettings().entries);
        trayController.render();
        portraitPanel.updateNavLabel();
    }

    function applyScan(messageTexts) {
        const settings = settingsStore.getSettings();
        const result = scanAndUpdateScene(messageTexts, settings, state);

        if (state.sceneNPCs.size === 0) {
            portraitPanel.close();
            trayController.render();
            portraitPanel.updateNavLabel();
            return;
        }

        const shouldAutoOpen = portraitPanel.isOpen();
        if (result.matchedEntryIdxs.size > 0 || state.activeEntryIdx !== null) {
            if (state.activeEntryIdx !== null) {
                switchActiveNPC(state.activeEntryIdx, { open: shouldAutoOpen });
            }
        } else {
            switchActiveNPC(state.sceneNPCs.keys().next().value, { open: shouldAutoOpen });
        }
    }

    function scanLatestMessagePair() {
        const { chat } = getContext();
        const latestMessages = getLatestUserAndAssistantMessages(chat);
        clearAllPortraits();
        if (latestMessages.length) {
            applyScan(latestMessages.map(message => message.mes ?? ''));
        }
    }

    function scanLatestAssistantMessage(message) {
        clearAllPortraits();
        applyScan(message?.mes ?? '');
    }

    function scanCurrentChat() {
        scanLatestMessagePair();
    }

    function addWandButton() {
        if (document.getElementById('npc-ps-wand-button')) return;

        const wandMenu = document.getElementById('extensionsMenu');
        if (!wandMenu) {
            console.warn('[NPC Portrait Switcher] Could not find the Extensions Wand menu.');
            return;
        }

        const button = document.createElement('div');
        button.id = 'npc-ps-wand-button';
        button.className = 'list-group-item flex-container flexGap5';
        button.title = 'Scan the latest user and assistant messages';

        const icon = document.createElement('div');
        icon.className = 'fa-solid fa-image-portrait extensionsMenuExtensionButton';

        const label = document.createElement('span');
        label.textContent = 'NPC Portraits';

        button.append(icon, label);
        button.addEventListener('click', scanCurrentChat);
        wandMenu.appendChild(button);
    }

    portraitPanel = createPortraitPanel({
        getSettings: settingsStore.getSettings,
        state,
        splitKeywords,
        onSelectNPC: switchActiveNPC,
    });
    trayController = createTrayController({
        getSettings: settingsStore.getSettings,
        saveSettings: settingsStore.saveSettings,
        state,
        splitKeywords,
        ensurePanel: portraitPanel.ensurePanel,
        onSelectNPC: switchActiveNPC,
    });
    settingsPanel = createSettingsPanel({
        getSettings: settingsStore.getSettings,
        saveSettings: settingsStore.saveSettings,
        cropImage,
        readFileAsDataUrl,
        compressImage,
        scanCurrentChat,
        clearAllPortraits,
        onEntriesReordered: handleEntriesReordered,
    });

    document.addEventListener('click', event => {
        settingsPanel.handleDocumentClick(event);
    });

    function initSettingsUI() {
        settingsPanel.init();
        portraitPanel.ensurePanel();
        addWandButton();
    }

    const { eventSource, event_types } = getContext();

    jQuery(() => {
        initSettingsUI();
    });

    eventSource.on(event_types.APP_READY, () => {
        if (!document.getElementById('npc-portrait-switcher-settings')) {
            initSettingsUI();
        }
        console.log('[NPC Portrait Switcher] Loaded.');
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, messageId => {
        const settings = settingsStore.getSettings();
        if (!settings.enabled) return;
        const { chat } = getContext();
        const message = chat[messageId];
        if (!message || message.is_user) return;
        scanLatestAssistantMessage(message);
    });

    eventSource.on(event_types.CHAT_CHANGED, () => {
        clearAllPortraits();
        settingsPanel.renderEntries();
    });

    return {
        applyScan,
        clearAllPortraits,
        scanCurrentChat,
    };
}