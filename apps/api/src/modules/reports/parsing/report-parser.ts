import type { ReportCategory, ReportFindingFlag } from '@longeviq/shared';
import { LAB_TESTS, UNIT_ALIASES, type LabTest } from './lab-lexicon.js';

export interface ParsedFinding {
  name: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: ReportFindingFlag | null;
  confidence: number;
  sortOrder: number;
}

const PARSEABLE_CATEGORIES = new Set<ReportCategory>(['BLOODWORK', 'GENERAL']);

const QUALITATIVE_VALUES =
  /\b(negative|positive|normal|abnormal|trace|not\s+detected|none\s+detected)\b/i;

const FLAG_MARKER = /[*↑↓]|\b(?:high|low|abnormal)\b|(?:^|[\s()])(h|l)(?=[\s.,;)($]|$)/i;

const NUMBER = /(\d+(?:[.,]\d+)?)/;

const UNIT_AFTER_VALUE = /([a-zA-Zµ%][\w%^./-]*)/;

interface RangeInfo {
  raw: string;
  check: (value: number) => ReportFindingFlag | null;
}

function parseReferenceRange(rest: string): { range: RangeInfo | null; rest: string } {
  const twoBound =
    /\(?\s*(?:ref(?:erence)?\.?[:=]?\s*)?([<>≤≥]?[\d.,]+)\s*(?:-|–|to)\s*([<>≤≥]?[\d.,]+)\s*\)?/i;
  const m2 = twoBound.exec(rest);
  if (m2) {
    const first = parseNumber(m2[1]!.replace(/[<>≤≥]/g, ''));
    const second = parseNumber(m2[2]!.replace(/[<>≤≥]/g, ''));
    if (first !== null && second !== null) {
      const lower = Math.min(first, second);
      const upper = Math.max(first, second);
      const range: RangeInfo = {
        raw: `${lower} - ${upper}`,
        check: (value) => (value < lower ? 'LOW' : value > upper ? 'HIGH' : 'NORMAL'),
      };
      return {
        range,
        rest: rest.slice(0, m2.index) + rest.slice(m2.index + m2[0].length),
      };
    }
  }

  const singleBound = /\(?\s*(?:ref(?:erence)?\.?[:=]?\s*)?([<>≤≥])\s*([\d.,]+)\s*\)?/i;
  const m1 = singleBound.exec(rest);
  if (m1) {
    const bound = parseNumber(m1[2]!);
    if (bound !== null) {
      const isUpperBound = m1[1] === '<' || m1[1] === '≤';
      const range: RangeInfo = {
        raw: `${m1[1]}${bound}`,
        check: (value) =>
          isUpperBound ? (value >= bound ? 'HIGH' : 'NORMAL') : value <= bound ? 'LOW' : 'NORMAL',
      };
      return {
        range,
        rest: rest.slice(0, m1.index) + rest.slice(m1.index + m1[0].length),
      };
    }
  }

  return { range: null, rest };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FULL_NAME_PATTERN = new RegExp(
  `(?:^|[\\s:(])(${LAB_TESTS.map((test) => escapeRegExp(test.name)).join('|')})(?=\\s|$|[:(])`,
  'i',
);

const ALIAS_PATTERN = new RegExp(
  `(?:^|[\\s:(])(${LAB_TESTS.flatMap((test) => test.aliases)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')})(?=\\s|$|[:(])`,
  'i',
);

const GENERIC_TEST_ROW =
  /^([A-Za-z][A-Za-z0-9 #().+-]{1,38}?)\s+(\d+(?:[.,]\d+)?)\s+([a-zA-Zµ%][\w%^./-]*)/;

function normalizeUnit(raw: string | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().replace(/[×x]/g, 'x').replace(/\s+/g, ' ').toLowerCase();
  return UNIT_ALIASES[key] ?? null;
}

function parseNumber(raw: string): number | null {
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function flagFromMarker(marker: string | undefined): ReportFindingFlag | null {
  if (!marker) return null;
  if (/high|↑|\*|abnormal|h/i.test(marker)) return 'HIGH';
  return 'LOW';
}

interface KnownTestMatch {
  test: LabTest;
  contentEnd: number;
}

function collectKnownTests(line: string): KnownTestMatch[] {
  const found: KnownTestMatch[] = [];

  const fullNames = LAB_TESTS.map((test) => ({
    name: test.name,
    test,
  }));
  let match: RegExpExecArray | null;
  for (const pattern of [FULL_NAME_PATTERN, ALIAS_PATTERN]) {
    const scanner = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    );
    while ((match = scanner.exec(line)) !== null) {
      const alias = match[1]!.toLowerCase();
      const test =
        fullNames.find((entry) => entry.name.toLowerCase() === alias)?.test ??
        LAB_TESTS.find((entry) =>
          entry.aliases.some((candidate) => candidate.toLowerCase() === alias),
        );
      if (test) {
        found.push({ test, contentEnd: match.index + match[0].length });
      }
    }
  }

  if (found.length === 0) return found;
  const best = found.reduce((max, current) =>
    current.contentEnd > max.contentEnd ? current : max,
  );
  return [best];
}

function findKnownTest(line: string): KnownTestMatch | null {
  // Prefer the match that extends furthest (e.g. "HEMOGLOBIN Alc" must map to
  // "Hemoglobin A1c", not the shorter canonical name "Hemoglobin").
  return collectKnownTests(line)[0] ?? null;
}

function normalizeText(text: string): string[] {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ ]+/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function toTitleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export class ReportParser {
  parse(text: string, category: ReportCategory): ParsedFinding[] {
    if (!PARSEABLE_CATEGORIES.has(category)) {
      return [];
    }

    const findings: ParsedFinding[] = [];
    const seen = new Set<string>();

    for (const line of normalizeText(text)) {
      const parsed = this.parseLine(line);
      if (!parsed) continue;
      const key = `${parsed.name}|${parsed.value}|${parsed.unit ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ ...parsed, sortOrder: findings.length });
    }

    return findings;
  }

  private parseLine(line: string): Omit<ParsedFinding, 'sortOrder'> | null {
    const known = findKnownTest(line);
    if (known) {
      return this.parseKnownRow(line, known.test, known.contentEnd);
    }
    return this.parseGenericRow(line);
  }

  private parseKnownRow(
    line: string,
    test: LabTest,
    contentEnd: number,
  ): Omit<ParsedFinding, 'sortOrder'> | null {
    let rest = line.slice(contentEnd);

    const qualitative = QUALITATIVE_VALUES.exec(rest);
    if (qualitative) {
      const value = qualitative[0].toLowerCase();
      return {
        name: test.name,
        value,
        unit: null,
        referenceRange: null,
        flag: /positive|abnormal/.test(value) ? 'HIGH' : null,
        confidence: 0.7,
      };
    }

    const { range, rest: restAfterRange } = parseReferenceRange(rest);
    rest = restAfterRange;

    const flagMatch = FLAG_MARKER.exec(rest);
    const explicitFlag = flagFromMarker(flagMatch?.[0]);
    if (flagMatch) {
      rest = rest.slice(0, flagMatch.index) + rest.slice(flagMatch.index + flagMatch[0].length);
    }

    const valueMatch = NUMBER.exec(rest);
    if (!valueMatch) return null;
    const valueRaw = valueMatch[0].replace(',', '.');

    const afterValue = rest.slice(valueMatch.index + valueMatch[0].length).trim();
    const unitMatch = afterValue.length > 0 ? UNIT_AFTER_VALUE.exec(afterValue) : null;
    const unit = normalizeUnit(unitMatch?.[1]) ?? test.defaultUnit;

    const value = parseNumber(valueRaw);
    const flag = explicitFlag ?? (value !== null && range ? range.check(value) : null);

    let confidence = 0.9;
    if (unitMatch) confidence += 0.05;
    if (range) confidence += 0.05;
    if (confidence > 1) confidence = 1;

    return {
      name: test.name,
      value: valueRaw,
      unit,
      referenceRange: range?.raw ?? null,
      flag,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  private parseGenericRow(line: string): Omit<ParsedFinding, 'sortOrder'> | null {
    const match = GENERIC_TEST_ROW.exec(line);
    if (!match) return null;
    const unit = normalizeUnit(match[3]!);
    if (!unit) return null;

    const { range } = parseReferenceRange(line);
    const value = parseNumber(match[2]!.replace(',', '.'));
    const flag = value !== null && range ? range.check(value) : null;

    return {
      name: toTitleCase(match[1]!),
      value: match[2]!.replace(',', '.'),
      unit,
      referenceRange: range?.raw ?? null,
      flag,
      confidence: 0.6,
    };
  }
}
