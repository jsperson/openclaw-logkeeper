import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface FormatEntryOpts {
  time: string;
  userAlias: string;
  assistantAlias: string;
  userText: string;
  assistantText: string;
  metaLine?: string;
}

// TUI/webchat: message follows a bracketed timestamp
const ENVELOPE_TIMESTAMP_RE = /\[\w{3} \d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})? \w+\] ([\s\S]+)$/;

// Discord: message sits between the last JSON fence and the untrusted context block.
// The greedy ^[\s\S]*``` matches up to the last fence close, then captures until
// the Untrusted context / EXTERNAL_UNTRUSTED_CONTENT sections or end of string.
const DISCORD_ENVELOPE_RE = /^[\s\S]*```\s*\n+([\s\S]*?)(?=\s*Untrusted context|\s*<<<EXTERNAL_UNTRUSTED_CONTENT|$)/;

export function stripEnvelope(text: string): string {
  const timestampMatch = ENVELOPE_TIMESTAMP_RE.exec(text);
  if (timestampMatch) return timestampMatch[1]!.trim();

  // Only attempt Discord extraction when envelope markers are present,
  // to avoid mangling user messages that legitimately contain code fences.
  if (text.includes("(untrusted metadata)") || text.includes("EXTERNAL_UNTRUSTED_CONTENT")) {
    const discordMatch = DISCORD_ENVELOPE_RE.exec(text);
    if (discordMatch) return discordMatch[1]!.trim();
  }

  return text.trim();
}

export function truncate(text: string, maxLength: number): string {
  if (maxLength === 0 || text.length <= maxLength) {
    return text;
  }
  return (
    text.slice(0, maxLength) +
    `\n\n*[truncated — ${text.length} chars]*`
  );
}

export function extractText(content: string | ContentBlock[]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n\n");
}

export function formatEntry(opts: FormatEntryOpts): string {
  const { time, userAlias, assistantAlias, userText, assistantText, metaLine } = opts;
  const meta = metaLine ? metaLine : "";
  return `\n### ${time}\n${meta}**${userAlias}:** ${userText}\n\n**${assistantAlias}:** ${assistantText}\n`;
}

export async function appendTurn(
  filePath: string,
  date: string,
  entry: string
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });

  // Atomically create the file with a date header if it doesn't exist.
  // flag:'ax' fails with EEXIST if the file is already there — that's fine.
  try {
    await appendFile(filePath, `# ${date}\n`, { flag: "ax" });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
  }

  await appendFile(filePath, entry);
}
