export type SuggestedField = 'title' | 'type' | 'category' | 'department' | 'businessUnit' | 'region' | 'owner' | 'classification' | 'effective' | 'expiry' | 'review' | 'due' | 'retentionStart' | 'description' | 'sourceReference';
export interface Suggestion {
  value: string;
  confidence: 'High' | 'Medium' | 'Low';
  evidence: string;
}
export type Suggestions = Partial<Record<SuggestedField, Suggestion>>;
const departmentNames = ['Human Resources', 'Finance', 'Information Technology', 'Operations', 'Administration', 'Procurement'];
const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function labelled(lines: string[], labels: string[]): string | undefined {
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(new RegExp('^\\s*' + label + '\\s*[:=–—]\\s*(.+)$', 'i'));
      if (match) return match[1].trim().slice(0, 180);
    }
  }
}
export function parseDocumentDate(raw: string): string | undefined {
  const value = raw.trim();
  let year: number, month: number, day: number;
  let match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (match) {
    year = +match[1];
    month = +match[2];
    day = +match[3];
  } else {
    match = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
    if (match) {
      day = +match[1];
      month = +match[2];
      year = +match[3];
    } else {
      match = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/);
      if (!match) return;
      day = +match[1];
      year = +match[3];
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      month = months.indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
    }
  }
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function inferMetadata(text: string, fileName: string): Suggestions {
  const lines = text.replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
  const suggestions: Suggestions = {};
  const put = (key: SuggestedField, value: string | undefined, evidence: string, confidence: Suggestion['confidence'] = 'High') => {
    if (value) suggestions[key] = {
      value,
      evidence: evidence.slice(0, 220),
      confidence
    };
  };
  const title = labelled(lines, ['document title', 'title', 'subject']);
  const heading = lines.slice(0, 12).find(s => s.length >= 8 && s.length <= 180 && !/^(Page \d|confidential|internal|restricted|public|document (number|reference)|department|owner|date|effective|expiry|review|version)\b/i.test(s) && !/^\w+\s*[:=]/.test(s));
  put('title', title || heading || fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), title ? 'Explicit document heading' : heading ? 'First readable heading' : 'Filename only; confirm title', title ? 'High' : heading ? 'Medium' : 'Low');
  const typeRules: [string, RegExp][] = [['Contract', /\b(service agreement|supplier agreement|supplier service agreement|contract|service level agreement|purchase agreement)\b/i], ['Agreement', /\b(agreement|memorandum of agreement)\b/i], ['Handbook', /\b(handbook)\b/i], ['Policy', /\b(policy|procedure|code of conduct)\b/i], ['Meeting minutes', /\b(meeting minutes|minutes of meeting)\b/i], ['Requirements document', /\b(project requirements|requirements document|project plan|specification)\b/i], ['Training material', /\b(training materials?|training guide|learning material)\b/i], ['Guidelines', /\b(operational guidelines|guidelines|operating instructions)\b/i], ['Report', /\b(report|financial statement|annual report)\b/i], ['Technical documentation', /\b(technical documentation|system documentation|installation guide|API documentation)\b/i], ['Spreadsheet', /\b(spreadsheet|workbook)\b/i], ['Presentation', /\b(presentation|slide deck)\b/i], ['Correspondence', /\b(dear (sir|madam|colleagues)|correspondence|yours (faithfully|sincerely))\b/i]];
  const explicitType = labelled(lines, ['document type', 'record type']);
  const exactType = typeRules.find(([type]) => explicitType && normal(type) === normal(explicitType));
  const content = lines.slice(0, 35).join('\n');
  const matching = typeRules.filter(([, pattern]) => pattern.test(content));
  const filenameMatch = typeRules.find(([, pattern]) => pattern.test(fileName.replace(/[_-]/g, ' ')));
  const inferred = exactType || matching[0] || filenameMatch;
  if (inferred) put('type', inferred[0], explicitType && exactType ? `Document type: ${explicitType}` : matching.length ? content.match(inferred[1])![0] : 'Filename classification', exactType ? 'High' : matching.length === 1 ? 'Medium' : 'Low');
  const explicitDept = labelled(lines, ['department', 'owning department', 'business function']);
  let department = departmentNames.find(d => explicitDept && normal(d) === normal(explicitDept));
  if (explicitDept && !department) department = ({
    hr: 'Human Resources',
    it: 'Information Technology',
    admin: 'Administration',
    ops: 'Operations'
  } as Record<string, string>)[normal(explicitDept)];
  const inferredDepartments: [string, RegExp][] = [['Human Resources', /human resources|hr policy|employee handbook/i], ['Finance', /annual report|financial statement|finance department/i], ['Procurement', /supplier agreement|supplier service agreement|procurement/i], ['Information Technology', /information technology|information security policy|technical documentation/i], ['Operations', /operational guidelines|operations department/i], ['Administration', /meeting minutes|administration department/i]];
  const inferredDept = inferredDepartments.find(([, pattern]) => pattern.test(content));
  if (department || inferredDept) {
    put('department', department || inferredDept![0], department ? `Department: ${explicitDept}` : 'Inferred from business context', department ? 'High' : 'Medium');
    put('category', department || inferredDept![0], department ? 'Owning department' : 'Inferred record category', department ? 'Medium' : 'Low');
  }
  const explicitCategory = labelled(lines, ['record category', 'category']);
  const category = departmentNames.find(d => explicitCategory && normal(d) === normal(explicitCategory));
  if (category) put('category', category, `Record category: ${explicitCategory}`);
  put('businessUnit', labelled(lines, ['business unit']), 'Business unit label');
  put('owner', labelled(lines, ['document owner', 'record owner', 'owner', 'prepared by']), 'Document owner / preparer label');
  const regionRaw = labelled(lines, ['region', 'regional office']);
  const region = regionRaw;
  put('region', region, `Region: ${regionRaw}`);
  const classificationRaw = labelled(lines, ['security classification', 'security level', 'classification']);
  const classification = ['Public', 'Internal', 'Confidential', 'Restricted'].find(c => classificationRaw && normal(c) === normal(classificationRaw));
  put('classification', classification, `Security classification: ${classificationRaw}`);
  const dates: [SuggestedField, string[]][] = [['effective', ['effective date', 'commencement date', 'date effective']], ['expiry', ['expiry date', 'expiration date', 'expires on', 'end date']], ['review', ['review date', 'next review date']], ['due', ['action due date', 'due date']]];
  for (const [field, names] of dates) {
    const raw = labelled(lines, names);
    put(field, raw ? parseDocumentDate(raw) : undefined, `${names[0]}: ${raw}`);
  }
  put('sourceReference', labelled(lines, ['document number', 'document no\\.?', 'agreement number', 'case number', 'reference number', 'reference']), 'Source document reference; internal record number is generated separately');
  put('retentionStart', labelled(lines, ['retention start event']), 'Retention start event label');
  if (text.trim()) put('description', lines.join(' ').slice(0, 700), 'Extracted document text summary; review before saving', 'Low');
  return suggestions;
}
export function mergeScannedMetadata(current: Record<string, string>, suggestions: Suggestions, edited: ReadonlySet<string>, allowedDepartments: readonly string[]) {
  const fields = {
    ...current
  };
  const skipped: string[] = [];
  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (!suggestion) continue;
    if (edited.has(key)) {
      skipped.push(key + ' (kept your edit)');
      continue;
    }
    if (key === 'department' && !allowedDepartments.includes(suggestion.value)) {
      skipped.push('department (outside your permitted scope)');
      continue;
    }
    fields[key] = suggestion.value;
  }
  return {
    fields,
    skipped
  };
}
