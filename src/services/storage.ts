import type {
  BotConfigData,
  PermissionsData,
  ViolationsData,
  WordsData,
} from "../types";

const DATA_DIR = `${process.cwd()}/data`;

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const path = `${DATA_DIR}/${filename}`;
  try {
    const file = Bun.file(path);
    const raw = await file.text();
    return JSON.parse(raw) as T;
  } catch {
    await writeJson(filename, fallback);
    return fallback;
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const path = `${DATA_DIR}/${filename}`;
  await Bun.write(path, JSON.stringify(data, null, 2));
}

export async function loadWords(): Promise<WordsData> {
  return readJson<WordsData>("words.json", {
    badWords: [],
    whiteListWords: [],
  });
}

export async function saveWords(data: WordsData): Promise<void> {
  await writeJson("words.json", data);
}

export async function loadPermissions(): Promise<PermissionsData> {
  return readJson<PermissionsData>("permissions.json", {
    ignoredChannels: [],
    allowedUsers: [],
  });
}

export async function savePermissions(data: PermissionsData): Promise<void> {
  await writeJson("permissions.json", data);
}

export async function loadViolations(): Promise<ViolationsData> {
  return readJson<ViolationsData>("violations.json", {});
}

export async function saveViolations(data: ViolationsData): Promise<void> {
  await writeJson("violations.json", data);
}

export async function incrementStrike(userId: string): Promise<number> {
  const violations = await loadViolations();
  violations[userId] = (violations[userId] ?? 0) + 1;
  await saveViolations(violations);
  return violations[userId];
}

export async function resetStrikes(userId: string): Promise<void> {
  const violations = await loadViolations();
  delete violations[userId];
  await saveViolations(violations);
}

export async function getStrikes(userId: string): Promise<number> {
  const violations = await loadViolations();
  return violations[userId] ?? 0;
}

export async function loadBotConfig(): Promise<BotConfigData> {
  return readJson<BotConfigData>("config.json", {
    timeoutDurationMs: 60000,
    maxStrikes: 3,
    notificationChannelId: "",
    logChannelId: "",
    dmWarningTitle: "🚨 REGIX SECURITY WARNING",
    dmWarningDesc:
      "You have violated the server's moderation policies.\n\n**Strike:** {strikes}/{maxStrikes}\n**Reason:** {reason}\n\n{banWarning}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**REGIX Studio** — *GOD MODE Active*",
    dmWarningThumbnail: "",
    dmWarningImage: "",
    logTitle: "🚨 Moderation Action Taken",
    logThumbnail: "",
    logImage: "",
    termsTitle: "📜 REGIX STUDIO — Bot Terms & Conditions",
    termsDesc:
      "**Welcome to REGIX GOD MODE!**\n\nThis bot is a private moderation system.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n**🔹 Terms of Use:**\n• You must be a designated server staff member.\n\n**REGIX Studio** — *GOD MODE Active*",
    termsThumbnail: "",
    termsImage: "",
    strikeTitle: "📊 REGIX Strike Check",
    strikeThumbnail: "",
    strikeImage: "",
    resetTitle: "✅ Strikes Reset",
    resetThumbnail: "",
    resetImage: "",
  });
}

export async function saveBotConfig(data: BotConfigData): Promise<void> {
  await writeJson("config.json", data);
}
