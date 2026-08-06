import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

// Prefer a real OpenAI-compatible key (OPENAI_API_KEY) once running outside
// Manus. Falls back to the legacy Manus "Forge" proxy so this keeps working
// unchanged during a gradual transition.
const usingRealOpenAI = () => !!ENV.openaiApiKey;

const resolveApiKey = () =>
  usingRealOpenAI() ? ENV.openaiApiKey : ENV.forgeApiKey;

const resolveApiUrl = () => {
  if (usingRealOpenAI()) {
    return `${ENV.openaiApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }
  return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";
};

const assertApiKey = () => {
  if (!resolveApiKey()) {
    throw new Error(
      "No LLM API key configured: set OPENAI_API_KEY (recommended once running outside Manus) or BUILT_IN_FORGE_API_KEY"
    );
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// ---------------------------------------------------------------------------
// max_tokens vs max_completion_tokens
//
// OpenAI's newer model families removed `max_tokens` in favour of
// `max_completion_tokens` and reject the old name with a 400. Verified against
// the live API: gpt-4.1-mini accepts `max_tokens`; gpt-5-mini and gpt-5.4-mini
// both reject it. Callers of invokeLLM keep using `maxTokens`/`max_tokens` --
// this module translates.
// ---------------------------------------------------------------------------

// Families known to require max_completion_tokens.
const MAX_COMPLETION_TOKENS_FAMILIES = [/^gpt-5/i, /^o1\b/i, /^o3\b/i, /^o4\b/i];

// Learned at runtime from a provider error, so an unknown future family is
// only ever wrong once per process.
const tokenParamOverrides = new Map<string, "max_tokens" | "max_completion_tokens">();

function usesMaxCompletionTokens(model: string | undefined): boolean {
  if (!model) return false;
  const learned = tokenParamOverrides.get(model);
  if (learned) return learned === "max_completion_tokens";
  return MAX_COMPLETION_TOKENS_FAMILIES.some(re => re.test(model));
}

function rememberTokenParam(model: string | undefined, param: "max_tokens" | "max_completion_tokens") {
  if (model) tokenParamOverrides.set(model, param);
}

// Returns the parameter name to switch to, if the error is the known
// unsupported-parameter complaint about the one we sent.
function detectTokenParamSwap(
  errorText: string,
  sent: "max_tokens" | "max_completion_tokens"
): "max_tokens" | "max_completion_tokens" | null {
  if (!/unsupported[_ ]parameter|not supported with this model|unrecognized request argument/i.test(errorText)) {
    return null;
  }
  if (!errorText.includes(sent)) return null;
  return sent === "max_tokens" ? "max_completion_tokens" : "max_tokens";
}

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Only these are worth retrying. 429 = rate limited, 5xx = the provider had a
// transient problem. Everything else (400 bad request, 401 bad key, 404 unknown
// model, 413 too large...) is deterministic: the identical request will fail
// identically, so retrying it just multiplies the user's wait.
const isRetryableStatus = (status: number) => status === 429 || status >= 500;

// PERFORMANCE FIX: a single generation could previously run for ~20 minutes.
//
// The old loop retried EVERY non-2xx response up to 5 times with backoff of up
// to 30s each, and server/weeklyPlanRouter.ts wraps that in its own 3-attempt
// loop. Worst case that is 3 x 5 = 15 full model calls plus up to 6 minutes of
// pure sleeping -- and with no timeout on fetch, one stalled connection could
// hang the request indefinitely, since Node's fetch has no default timeout.
//
// Now: only transient failures are retried, each request is bounded by a hard
// timeout, and the whole call is bounded by an overall deadline.
const REQUEST_TIMEOUT_MS = 120_000; // one attempt
const TOTAL_DEADLINE_MS = 240_000;  // all attempts combined

const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;
  const startedAt = Date.now();
  const timeLeft = () => TOTAL_DEADLINE_MS - (Date.now() - startedAt);

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    // Give the attempt whatever is left of the overall budget, capped at the
    // per-request timeout, so total time can never exceed the deadline.
    const budget = Math.min(REQUEST_TIMEOUT_MS, timeLeft());
    if (budget <= 0) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budget);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok || !isRetryableStatus(response.status) || attempt === RETRY_MAX_RETRIES) {
        // Non-retryable failures are returned as-is so the caller can read the
        // provider's message and surface something useful, instead of the user
        // waiting out four pointless retries first.
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      const delay = Math.min(computeBackoffDelay(attempt, retryAfterMs), Math.max(0, timeLeft()));
      if (delay <= 0) break;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(delay);
    } catch (error) {
      lastError = error;
      const aborted = (error as Error)?.name === "AbortError";
      if (aborted) {
        console.warn(`LLM request attempt ${attempt + 1} timed out after ${Math.round(budget / 1000)}s`);
      }
      if (attempt === RETRY_MAX_RETRIES || timeLeft() <= 0) break;
      const delay = Math.min(computeBackoffDelay(attempt), Math.max(0, timeLeft()));
      if (delay <= 0) break;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (model) {
    payload.model = model;
  } else if (usingRealOpenAI()) {
    // Forge picks a default model server-side when none is given; real
    // OpenAI's API requires one explicitly.
    payload.model = ENV.openaiDefaultModel;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  // COMPATIBILITY FIX: newer OpenAI model families (gpt-5.x and the o1/o3/o4
  // reasoning models) removed `max_tokens` and accept only
  // `max_completion_tokens`; they reject the old name outright with
  // "Unsupported parameter: 'max_tokens' is not supported with this model".
  // Because server/weeklyPlanRouter.ts passes max_tokens: 8000 on every weekly
  // plan generation, sending the legacy name made ALL of those models unusable
  // -- all three retry attempts failed and the user saw
  // "فشل في إنشاء الخطة الأسبوعية". The parameter name is now chosen per model,
  // with a runtime fallback (below) so a future family we don't know about
  // still works instead of hard-failing.
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  const tokenParam = usesMaxCompletionTokens(payload.model as string | undefined)
    ? "max_completion_tokens"
    : "max_tokens";
  if (typeof resolvedMaxTokens === "number") {
    payload[tokenParam] = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const send = () =>
    fetchWithBackoff(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${resolveApiKey()}`,
      },
      body: JSON.stringify(payload),
    });

  let response = await send();

  // Runtime safety net for the token-parameter split described above: if the
  // provider rejects the name we chose, swap to the other one and retry once,
  // and remember the answer so subsequent calls for this model get it right
  // first time. This keeps the app working against models released after this
  // code was written, in either direction.
  if (!response.ok && typeof resolvedMaxTokens === "number") {
    const errorText = await response.text();
    const swapTo = detectTokenParamSwap(errorText, tokenParam);
    if (swapTo) {
      delete payload[tokenParam];
      payload[swapTo] = resolvedMaxTokens;
      rememberTokenParam(payload.model as string | undefined, swapTo);
      response = await send();
    } else {
      throw new Error(
        `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
      );
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  assertApiKey();

  const url = usingRealOpenAI()
    ? `${ENV.openaiApiUrl.replace(/\/$/, "")}/v1/models`
    : ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models`
      : "https://forge.manus.im/v1/models";

  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${resolveApiKey()}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}
