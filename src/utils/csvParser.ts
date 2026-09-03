import Papa from "papaparse";

export interface CsvFeedbackRow {
  content: string;
  channel: string;
  customer_label?: string;
  created_at?: string;
}

export interface ParseResult {
  data: CsvFeedbackRow[];
  errors: string[];
}

const VALID_CHANNELS = ["support", "appstore", "nps", "sales", "community"];

export function parseFeedbackCsv(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const errors: string[] = [];
  const data: CsvFeedbackRow[] = [];

  if (result.errors.length > 0) {
    errors.push(...result.errors.map((e) => e.message));
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNum = i + 2; // 1-indexed + header

    if (!row.content || !row.content.trim()) {
      errors.push(`Row ${rowNum}: missing 'content' field`);
      continue;
    }

    let channel = (row.channel || "support").toLowerCase().trim();
    if (!VALID_CHANNELS.includes(channel)) {
      channel = "support";
    }

    data.push({
      content: row.content.trim(),
      channel,
      customer_label: row.customer_label?.trim() || undefined,
      created_at: row.created_at?.trim() || undefined,
    });
  }

  return { data, errors };
}
