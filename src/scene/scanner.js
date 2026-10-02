import { DEBUG } from '../config.js';
import { findKeywordMatches, splitKeywords } from '../matching/keywords.js';
import { reorderSceneNPCs } from './state.js';

function getPortraitImages(entries, entryIdx) {
    const entry = entries[entryIdx];
    if (!entry) return [];
    const images = [];
    if (entry.imageData) images.push(entry.imageData);
    for (const expr of (entry.expressions || [])) {
        if (expr.imageData) images.push(expr.imageData);
    }
    return images;
}

function getCharacterMatches(texts, keywords, caseSensitive, triggerCount) {
    const matches = [];
    let triggered = false;
    let textOffset = 0;

    for (const text of texts) {
        const textMatches = findKeywordMatches(text, keywords, caseSensitive);
        if (textMatches.length >= triggerCount) triggered = true;
        matches.push(...textMatches.map(match => ({
            ...match,
            start: match.start + textOffset,
            end: match.end + textOffset,
        })));
        textOffset += text.length + 1;
    }

    return { matches, triggered };
}

function distanceBetweenMatches(first, second) {
    if (first.end < second.start) return second.start - first.end;
    if (second.end < first.start) return first.start - second.end;
    return 0;
}

function getSegmentBounds(text, position) {
    const separators = '.!?\n';
    let start = position;
    let end = position;

    while (start > 0 && !separators.includes(text[start - 1])) start--;
    while (end < text.length && !separators.includes(text[end])) end++;

    return { start, end };
}

function isWithinSegment(match, segment) {
    return match.start >= segment.start && match.end <= segment.end;
}

function getNearestEntryIdx(expressionMatch, characterMatches, combinedText) {
    const segment = getSegmentBounds(combinedText, expressionMatch.start);
    const nearbyMatches = characterMatches.filter(({ match }) => isWithinSegment(match, segment));
    const candidates = nearbyMatches.length > 0 ? nearbyMatches : characterMatches;
    let nearestEntryIdx = null;
    let nearestDistance = Infinity;

    for (const { entryIdx, match } of candidates) {
        const distance = distanceBetweenMatches(expressionMatch, match);
        if (distance < nearestDistance) {
            nearestEntryIdx = entryIdx;
            nearestDistance = distance;
        }
    }

    return nearestEntryIdx;
}

export function scanAndUpdateScene(messageTexts, settings, state) {
    if (!settings.enabled || !settings.entries.length) {
        return { matchedEntryIdxs: new Set(), activeEntryIdx: state.activeEntryIdx };
    }

    reorderSceneNPCs(state, settings.entries);

    const texts = Array.isArray(messageTexts) ? messageTexts : [messageTexts];
    const combinedText = texts.join('\n');
    const matchedThisMessage = new Set();
    const characterMatches = [];
    const matchedEntries = [];

    for (let entryIdx = 0; entryIdx < settings.entries.length; entryIdx++) {
        const entry = settings.entries[entryIdx];
        if (!entry.imageData) continue;

        const charKeywords = splitKeywords(entry.keyword);
        if (charKeywords.length === 0) continue;

        const triggerCount = entry.mentionsBeforeTrigger || 1;
        const entryCharacterMatches = getCharacterMatches(texts, charKeywords, settings.caseSensitive, triggerCount);
        if (!entryCharacterMatches.triggered) continue;

        characterMatches.push(...entryCharacterMatches.matches.map(match => ({ entryIdx, match })));
        matchedEntries.push({ entryIdx, entry });

        matchedThisMessage.add(entryIdx);
    }

    for (const { entryIdx, entry } of matchedEntries) {
        let imageIdx = 0;
        if (Array.isArray(entry.expressions)) {
            for (let exprIdx = 0; exprIdx < entry.expressions.length; exprIdx++) {
                const expr = entry.expressions[exprIdx];
                if (!expr.imageData) continue;
                const exprKeywords = splitKeywords(expr.keyword);
                if (exprKeywords.length === 0) continue;
                const expressionMatches = findKeywordMatches(combinedText, exprKeywords, settings.caseSensitive);
                const belongsToEntry = expressionMatches.some(expressionMatch =>
                    getNearestEntryIdx(expressionMatch, characterMatches, combinedText) === entryIdx,
                );
                if (belongsToEntry) {
                    imageIdx = exprIdx + 1;
                    if (DEBUG) console.log(`[NPC Portrait Switcher] Expression matched: "${expr.keyword}"`);
                    break;
                }
            }
        }

        if (DEBUG) console.log(`[NPC Portrait Switcher] Character matched: "${entry.keyword}" entryIdx=${entryIdx} imageIdx=${imageIdx}`);

        if (state.sceneNPCs.has(entryIdx)) {
            const npcState = state.sceneNPCs.get(entryIdx);
            npcState.entry = entry;
            npcState.imageIdx = imageIdx;
            npcState.replyCounter = 0;
        } else {
            state.sceneNPCs.set(entryIdx, {
                entryIdx,
                entry,
                imageIdx,
                replyCounter: 0,
            });
        }
    }

    const toRemove = [];
    for (const [entryIdx, npcState] of state.sceneNPCs) {
        if (matchedThisMessage.has(entryIdx)) {
            npcState.replyCounter = 0;
            continue;
        }

        npcState.replyCounter = (npcState.replyCounter || 0) + 1;

        if (!settings.autoClose) {
            if (matchedThisMessage.size > 0) {
                if (settings.stickyReplies > 0 && npcState.replyCounter <= settings.stickyReplies) {
                    continue;
                }
                toRemove.push(entryIdx);
            }
            continue;
        }

        if (settings.stickyReplies > 0 && npcState.replyCounter <= settings.stickyReplies) {
            continue;
        }
        toRemove.push(entryIdx);
    }

    for (const entryIdx of toRemove) {
        state.sceneNPCs.delete(entryIdx);
        if (state.activeEntryIdx === entryIdx) {
            state.activeEntryIdx = null;
            state.pinnedEntryIdx = null;
        }
    }

    reorderSceneNPCs(state, settings.entries);

    if (state.sceneNPCs.size === 0) {
        state.activeEntryIdx = null;
        return { matchedEntryIdxs: matchedThisMessage, activeEntryIdx: null };
    }

    if (matchedThisMessage.size > 0) {
        if (state.pinnedEntryIdx !== null && state.sceneNPCs.has(state.pinnedEntryIdx)) {
            state.activeEntryIdx = state.pinnedEntryIdx;
        } else {
            const firstMatched = [...matchedThisMessage].find(idx => state.sceneNPCs.has(idx));
            if (firstMatched !== undefined) state.activeEntryIdx = firstMatched;
        }
    } else if (state.activeEntryIdx !== null && state.sceneNPCs.has(state.activeEntryIdx)) {
        // Keep the active NPC while it remains within the sticky scene.
    } else {
        state.activeEntryIdx = state.sceneNPCs.keys().next().value;
    }

    return { matchedEntryIdxs: matchedThisMessage, activeEntryIdx: state.activeEntryIdx };
}

export function getLatestUserAndAssistantMessages(chat) {
    if (!Array.isArray(chat)) return [];

    const latestAssistant = [...chat].findLast(message => message && !message.is_user);
    const latestUser = [...chat].findLast(message => message && message.is_user);

    return [latestUser, latestAssistant].filter(Boolean);
}

export function getPortraitImageCount(entries, entryIdx) {
    return getPortraitImages(entries, entryIdx).length;
}