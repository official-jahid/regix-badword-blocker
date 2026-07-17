import type { BotConfig, PipelineResult } from "../types";
import { aiModerate, discoverWords } from "./openRouter";
import { loadPermissions, loadWords, saveWords } from "./storage";

function normaliseWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .replace(/(.)\1{2,}/g, "$1$1");
}

function normaliseText(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normaliseWord)
    .filter((w) => w.length > 0);
}

function isWhitelisted(word: string, whiteList: string[]): boolean {
  return whiteList.some((w) => word.includes(w));
}

function isBadWord(word: string, badWords: string[]): string | null {
  for (const bw of badWords) {
    if (word.includes(bw)) return bw;
  }
  return null;
}

function localCheck(
  words: string[],
  badWords: string[],
  whiteList: string[],
): string | null {
  for (const word of words) {
    if (isWhitelisted(word, whiteList)) continue;
    const match = isBadWord(word, badWords);
    if (match) return match;
  }
  return null;
}

export async function shouldBypass(
  authorId: string,
  channelId: string,
): Promise<boolean> {
  const { allowedUsers, ignoredChannels } = await loadPermissions();
  return allowedUsers.includes(authorId) || ignoredChannels.includes(channelId);
}

export async function runPipeline(
  content: string,
  authorId: string,
  channelId: string,
  config: BotConfig,
): Promise<PipelineResult> {
  if (await shouldBypass(authorId, channelId)) return { flagged: false };
  const words = normaliseText(content);
  if (words.length === 0) return { flagged: false };
  const { badWords, whiteListWords } = await loadWords();
  const localMatch = localCheck(words, badWords, whiteListWords);
  if (localMatch)
    return { flagged: true, reason: "local", flaggedWords: [localMatch] };
  if (config.openRouterApiKey) {
    const aiFlagged = await aiModerate(content, config);
    if (aiFlagged) {
      const discovery = await discoverWords(content, config);
      if (
        discovery.newBadWords.length > 0 ||
        discovery.newWhiteListWords.length > 0
      ) {
        const current = await loadWords();
        const mergedBad = [
          ...new Set([...current.badWords, ...discovery.newBadWords]),
        ];
        const mergedWhite = [
          ...new Set([
            ...current.whiteListWords,
            ...discovery.newWhiteListWords,
          ]),
        ];
        await saveWords({ badWords: mergedBad, whiteListWords: mergedWhite });
        console.log(
          `[WordDiscovery] Added ${discovery.newBadWords.length} bad, ${discovery.newWhiteListWords.length} whitelist`,
        );
      }
      return {
        flagged: true,
        reason: "ai",
        flaggedWords:
          discovery.newBadWords.length > 0 ? discovery.newBadWords : undefined,
      };
    }
  }
  return { flagged: false };
}
