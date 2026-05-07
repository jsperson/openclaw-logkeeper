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

// Matches OpenClaw's injected timestamp line: [Thu 2026-05-07 16:31 CDT] message
const ENVELOPE_TIMESTAMP_RE = /\[\w{3} \d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})? \w+\] ([\s\S]+)$/;

export function stripEnvelope(text: string): string {
  const match = ENVELOPE_TIMESTAMP_RE.exec(text);
  return match ? match[1]!.trim() : text.trim();
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
