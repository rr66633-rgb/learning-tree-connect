/**
 * Robust JSON Parser with Auto-Repair
 * Handles malformed JSON from LLM responses including:
 * - Unterminated strings
 * - Trailing commas
 * - Missing closing brackets
 * - Control characters in strings
 * - Truncated responses
 */

/**
 * Attempt to repair common JSON issues from LLM output
 */
function repairJson(raw: string): string {
  let text = raw.trim();

  // Remove markdown code fences if present
  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }
  text = text.trim();

  // Remove any leading/trailing non-JSON characters
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let start = -1;
  if (firstBrace === -1 && firstBracket === -1) {
    return text;
  } else if (firstBrace === -1) {
    start = firstBracket;
  } else if (firstBracket === -1) {
    start = firstBrace;
  } else {
    start = Math.min(firstBrace, firstBracket);
  }
  text = text.slice(start);

  // Remove control characters that break JSON (except \n, \r, \t)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");

  // Fix unescaped newlines inside strings
  text = fixUnescapedNewlinesInStrings(text);

  // Remove trailing commas before } or ]
  text = text.replace(/,\s*([\]}])/g, "$1");

  // Try to close unclosed brackets/braces
  text = closeUnclosedBrackets(text);

  return text;
}

/**
 * Fix unescaped newlines and tabs inside JSON string values
 */
function fixUnescapedNewlinesInStrings(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "\t") {
        result += "\\t";
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }

  // If we ended inside a string, close it
  if (inString) {
    result += '"';
  }

  return result;
}

/**
 * Close any unclosed brackets or braces
 */
function closeUnclosedBrackets(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
  }

  // Close any remaining open brackets
  while (stack.length > 0) {
    text += stack.pop();
  }

  return text;
}

/**
 * Attempt to truncate JSON at the last valid point
 * Useful when the response was cut off mid-way
 */
function truncateToLastValidPoint(text: string): string {
  // Find the last complete object/array ending
  let lastValidEnd = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === "{" || ch === "[") {
        depth++;
      } else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          lastValidEnd = i;
        }
      }
    }
  }

  if (lastValidEnd > 0) {
    return text.slice(0, lastValidEnd + 1);
  }
  return text;
}

export interface ParseResult<T = any> {
  success: boolean;
  data: T | null;
  error?: string;
  repaired?: boolean;
}

/**
 * Safely parse JSON with multiple repair strategies
 */
export function safeJsonParse<T = any>(raw: string | null | undefined): ParseResult<T> {
  if (!raw || raw.trim() === "") {
    return { success: false, data: null, error: "Empty response from AI" };
  }

  // Strategy 1: Direct parse
  try {
    const data = JSON.parse(raw) as T;
    return { success: true, data, repaired: false };
  } catch (_e) {
    // Continue to repair strategies
  }

  // Strategy 2: Repair and parse
  try {
    const repaired = repairJson(raw);
    const data = JSON.parse(repaired) as T;
    return { success: true, data, repaired: true };
  } catch (_e) {
    // Continue to next strategy
  }

  // Strategy 3: Truncate to last valid point, then repair
  try {
    const truncated = truncateToLastValidPoint(raw);
    const repaired = repairJson(truncated);
    const data = JSON.parse(repaired) as T;
    return { success: true, data, repaired: true };
  } catch (_e) {
    // Continue to next strategy
  }

  // Strategy 4: Extract JSON from within the text
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const repaired = repairJson(jsonMatch[0]);
      const data = JSON.parse(repaired) as T;
      return { success: true, data, repaired: true };
    }
  } catch (_e) {
    // All strategies failed
  }

  return {
    success: false,
    data: null,
    error: "فشل في تحليل استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.",
  };
}

/**
 * Validate weekly plan structure - ensure all required fields exist
 */
export function validateWeeklyPlan(data: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!data) {
    issues.push("البيانات فارغة");
    return { valid: false, issues };
  }

  if (!data.title) issues.push("عنوان الخطة مفقود");
  if (!data.days || !Array.isArray(data.days)) {
    issues.push("أيام الخطة مفقودة");
    return { valid: false, issues };
  }

  if (data.days.length < 3) {
    issues.push(`عدد الأيام غير كافٍ (${data.days.length} من 5)`);
  }

  for (let i = 0; i < data.days.length; i++) {
    const day = data.days[i];
    if (!day.day) issues.push(`اليوم ${i + 1}: اسم اليوم مفقود`);
    if (!day.learningObjective) issues.push(`اليوم ${i + 1}: الهدف التعليمي مفقود`);
    if (!day.circleTime) issues.push(`اليوم ${i + 1}: حلقة الصباح مفقودة`);
    if (!day.mainActivity) issues.push(`اليوم ${i + 1}: النشاط الرئيسي مفقود`);
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Validate generic AI content structure
 */
export function validateAIContent(data: any, requiredFields: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!data) {
    issues.push("البيانات فارغة");
    return { valid: false, issues };
  }

  for (const field of requiredFields) {
    if (!data[field]) {
      issues.push(`الحقل "${field}" مفقود`);
    }
  }

  return { valid: issues.length === 0, issues };
}
