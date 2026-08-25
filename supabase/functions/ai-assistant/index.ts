/**
 * OPTIONAL LLM gateway (OpenAI).
 *
 * Free AI Hub (Marketing templates + Sales Analyst RPC) does NOT call this
 * function and does NOT need OPENAI_API_KEY. Keep this deploy only if you
 * re-enable paid chat later.
 *
 * Streams NDJSON lines:
 *   {"type":"meta","conversationId":"..."}
 *   {"type":"delta","content":"..."}
 *   {"type":"poster","payload":{...}}
 *   {"type":"done","messageId":"...","conversationId":"..."}
 *   {"type":"error","error":"..."}
 */
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const MAX_MESSAGE_CHARS = 4000;
const RATE_LIMIT_PER_HOUR = 40;
const MAX_HISTORY_MESSAGES = 20;

type ChatBody = {
  message?: string;
  conversationId?: string | null;
};

type OpenAiToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
  name?: string;
};

type PosterPayload = {
  headline: string;
  subheadline?: string;
  body?: string;
  cta?: string;
  festival?: string;
  language?: 'en' | 'mr' | 'hi';
  style?: 'festive' | 'promo' | 'greeting';
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitizeUserMessage(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
}

function ndjsonLine(obj: unknown): string {
  return `${JSON.stringify(obj)}\n`;
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_dashboard_stats',
      description:
        'Get today\'s booking count, collection, pending amounts, and delivered count for this vendor stall.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_bookings',
      description:
        'Search bookings by booking number, customer name, or mobile. Also supports filters for today, pending status, or date range.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search text for booking number, name, or mobile',
          },
          today_only: { type: 'boolean' },
          status: {
            type: 'string',
            enum: ['Pending', 'Delivered'],
          },
          limit: { type: 'number' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_customers',
      description:
        'List customers aggregated from bookings (name, mobile, booking count, total spent). Use for top customers or personalization context. Do not expose full lists of phone numbers unless the vendor asks.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          sort_by: {
            type: 'string',
            enum: ['spent', 'bookings', 'name'],
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pending_payments',
      description:
        'List bookings with pending balance greater than zero, sorted by pending amount.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_murti_stock_insights',
      description:
        'Summarize murti names/sizes from recent bookings as stock insights (NOT a real inventory system). Clearly treat results as booking-based insights.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Lookback days (default 90)' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_vendor_profile',
      description:
        'Get this stall\'s business name, phone, address, map link, and stall description for marketing copy.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_customer',
      description:
        'Find a customer by name or mobile from bookings for personalized marketing. Returns limited PII needed for drafting (name, mobile, last booking). Never auto-send messages.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Customer name or mobile digits',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_poster',
      description:
        'Prepare a festival/promo poster brief. The app will render this as an HTML/PDF poster the vendor can share. Call when the user asks to generate a poster.',
      parameters: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          subheadline: { type: 'string' },
          body: { type: 'string' },
          cta: { type: 'string' },
          festival: { type: 'string' },
          language: { type: 'string', enum: ['en', 'mr', 'hi'] },
          style: {
            type: 'string',
            enum: ['festive', 'promo', 'greeting'],
          },
        },
        required: ['headline'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sales_analysis',
      description:
        'Sales Analyst pack: top-selling idol, revenue by month, most profitable murti by revenue, repeat customers, and slow-moving murti/size combos from bookings. Not live inventory; profit uses revenue as proxy.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Lookback days (default 180)',
          },
        },
        additionalProperties: false,
      },
    },
  },
];

function buildSystemPrompt(businessName: string): string {
  return `You are the AI Hub assistant for "${businessName || 'this Ganapati murti stall'}" on Ganeshay (Bappaji booking app).

The app has ONE AI hub with three modes (you serve all of them in chat):
1) AI Chat — bookings, payments, customers, everyday stall Q&A
2) AI Marketing — WhatsApp, Marathi, Instagram captions, festival greetings, poster briefs; personalize from customer tools when asked
3) AI Sales Analyst — top-selling idols, revenue trends, profitable murti types, repeat customers, slow-moving demand (use get_sales_analysis)

Rules:
- Only use data from the provided tools. Never invent booking numbers, amounts, or customers.
- Vendor scope is enforced server-side; never ask for or accept a vendor_id.
- Respect PII: when listing customers, prefer names + last 4 digits of mobile unless the owner asks for full numbers for WhatsApp drafting.
- NEVER send WhatsApp, SMS, email, or social posts automatically. Only draft copy. Tell the owner they can copy or tap Share to send manually.
- For inventory/stock: there is no inventory table. Use get_murti_stock_insights / get_sales_analysis and clearly say these are booking-demand insights, not live stock counts.
- “Most profitable” means highest booking revenue for that murti name (no cost/COGS table).
- For Marathi: write natural Marathi (Devanagari). For WhatsApp: keep messages concise with light emoji, suitable for Indian customers.
- For Instagram captions: include a short caption + 5–10 relevant hashtags.
- For festival greetings: warm, respectful, suitable for Ganesh Chaturthi / related festivals unless another festival is named.
- When creating a poster, call prepare_poster with concise headline/body/CTA; also briefly describe the poster in chat.
- Be concise, practical, and friendly. Use ₹ for money. Dates in India-friendly format.
- Refuse requests unrelated to stall business/marketing/sales analysis, or anything harmful.`;
}

async function getVendorId(userClient: SupabaseClient): Promise<string | null> {
  const { data, error } = await userClient.rpc('get_my_vendor_id');
  if (error) throw error;
  return (data as string | null) ?? null;
}

async function checkRateLimit(
  userClient: SupabaseClient,
  vendorId: string,
  userId: string
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await userClient
    .from('ai_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) {
    console.warn('rate limit check failed', error);
    return true;
  }
  return (count ?? 0) < RATE_LIMIT_PER_HOUR;
}

async function logRequest(
  userClient: SupabaseClient,
  params: {
    vendorId: string;
    userId: string;
    conversationId: string | null;
    model: string;
    status: string;
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
  }
) {
  await userClient.from('ai_request_logs').insert({
    vendor_id: params.vendorId,
    user_id: params.userId,
    conversation_id: params.conversationId,
    model: params.model,
    status: params.status,
    error_message: params.errorMessage ?? null,
    prompt_tokens: params.promptTokens ?? null,
    completion_tokens: params.completionTokens ?? null,
  });
}

// ---- Tool implementations (userClient = JWT + RLS) ----

async function toolDashboardStats(userClient: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayBookings, error: e1 } = await userClient
    .from('bookings')
    .select('advance, pending, status, price')
    .eq('booking_date', today);

  const { data: allPending, error: e2 } = await userClient
    .from('bookings')
    .select('pending')
    .eq('status', 'Pending')
    .gt('pending', 0);

  const { count: deliveredCount, error: e3 } = await userClient
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Delivered');

  const { count: totalCount, error: e4 } = await userClient
    .from('bookings')
    .select('*', { count: 'exact', head: true });

  if (e1 || e2 || e3 || e4) {
    throw e1 || e2 || e3 || e4;
  }

  const todayCollection =
    todayBookings?.reduce((sum, b) => sum + Number(b.advance), 0) ?? 0;
  const pendingAmount =
    allPending?.reduce((sum, b) => sum + Number(b.pending), 0) ?? 0;

  return {
    todayBookingsCount: todayBookings?.length ?? 0,
    todayCollection,
    pendingAmount,
    pendingBookingCount: allPending?.length ?? 0,
    deliveredCount: deliveredCount ?? 0,
    totalBookingsCount: totalCount ?? 0,
    date: today,
  };
}

async function toolSearchBookings(
  userClient: SupabaseClient,
  args: {
    query?: string;
    today_only?: boolean;
    status?: string;
    limit?: number;
  }
) {
  const limit = Math.min(Math.max(Number(args.limit) || 12, 1), 25);
  let q = userClient
    .from('bookings')
    .select(
      'booking_number, customer_name, mobile, booking_date, delivery_date, murti_name, murti_size, price, advance, pending, payment_mode, status'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (args.today_only) {
    const today = new Date().toISOString().split('T')[0];
    q = q.eq('booking_date', today);
  }
  if (args.status === 'Pending' || args.status === 'Delivered') {
    q = q.eq('status', args.status);
  }
  const query = (args.query ?? '').trim();
  if (query) {
    q = q.or(
      `booking_number.ilike.%${query}%,customer_name.ilike.%${query}%,mobile.ilike.%${query}%`
    );
  }

  const { data, error } = await q;
  if (error) throw error;

  return {
    count: data?.length ?? 0,
    bookings: (data ?? []).map((b) => ({
      ...b,
      mobile_masked: maskMobile(String(b.mobile ?? '')),
    })),
  };
}

function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `******${digits.slice(-4)}`;
}

async function toolListCustomers(
  userClient: SupabaseClient,
  args: { limit?: number; sort_by?: string }
) {
  const limit = Math.min(Math.max(Number(args.limit) || 12, 1), 25);
  const { data, error } = await userClient
    .from('bookings')
    .select('customer_name, mobile, price, booking_date, booking_number')
    .order('booking_date', { ascending: false })
    .limit(300);

  if (error) throw error;

  const map = new Map<
    string,
    {
      customerName: string;
      mobile_masked: string;
      mobile_full?: string;
      totalBookings: number;
      totalSpent: number;
      lastBookingDate: string;
      lastBookingNumber: string;
    }
  >();

  for (const row of data ?? []) {
    const key = String(row.mobile ?? '').trim();
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        customerName: row.customer_name,
        mobile_masked: maskMobile(key),
        totalBookings: 1,
        totalSpent: Number(row.price),
        lastBookingDate: row.booking_date,
        lastBookingNumber: row.booking_number,
      });
      continue;
    }
    existing.totalBookings += 1;
    existing.totalSpent += Number(row.price);
    if (row.booking_date > existing.lastBookingDate) {
      existing.lastBookingDate = row.booking_date;
      existing.lastBookingNumber = row.booking_number;
      existing.customerName = row.customer_name;
    }
  }

  let customers = Array.from(map.values());
  const sortBy = args.sort_by ?? 'spent';
  if (sortBy === 'bookings') {
    customers.sort((a, b) => b.totalBookings - a.totalBookings);
  } else if (sortBy === 'name') {
    customers.sort((a, b) => a.customerName.localeCompare(b.customerName));
  } else {
    customers.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  customers = customers.slice(0, limit);
  return { count: customers.length, customers };
}

async function toolPendingPayments(
  userClient: SupabaseClient,
  args: { limit?: number }
) {
  const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 25);
  const { data, error } = await userClient
    .from('bookings')
    .select(
      'booking_number, customer_name, mobile, pending, price, advance, payment_mode, status, booking_date'
    )
    .gt('pending', 0)
    .order('pending', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []).map((b) => ({
    ...b,
    mobile_masked: maskMobile(String(b.mobile ?? '')),
  }));
  const totalPending = rows.reduce((s, b) => s + Number(b.pending), 0);

  return { count: rows.length, totalPending, bookings: rows };
}

async function toolMurtiStockInsights(
  userClient: SupabaseClient,
  args: { days?: number }
) {
  const days = Math.min(Math.max(Number(args.days) || 90, 7), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await userClient
    .from('bookings')
    .select('murti_name, murti_size, status, booking_date')
    .gte('booking_date', sinceStr)
    .limit(400);

  if (error) throw error;

  const byName = new Map<string, number>();
  const bySize = new Map<string, number>();
  const byNameSize = new Map<string, number>();

  for (const row of data ?? []) {
    const name = (row.murti_name || 'Unknown').trim() || 'Unknown';
    const size = (row.murti_size || 'Unspecified').trim() || 'Unspecified';
    byName.set(name, (byName.get(name) ?? 0) + 1);
    bySize.set(size, (bySize.get(size) ?? 0) + 1);
    const key = `${name} / ${size}`;
    byNameSize.set(key, (byNameSize.get(key) ?? 0) + 1);
  }

  const top = (m: Map<string, number>, n = 10) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([label, count]) => ({ label, count }));

  return {
    note:
      'These are booking-based murti insights (sizes/types booked), NOT live inventory stock counts. No inventory table exists.',
    lookbackDays: days,
    totalBookingsInPeriod: data?.length ?? 0,
    topMurtiNames: top(byName),
    topMurtiSizes: top(bySize),
    topNameSizeCombos: top(byNameSize),
  };
}

async function toolVendorProfile(userClient: SupabaseClient, vendorId: string) {
  const { data, error } = await userClient
    .from('vendors')
    .select(
      'business_name, phone, address, map_link, stall_description, booking_prefix, ai_enabled'
    )
    .eq('id', vendorId)
    .single();

  if (error) throw error;
  return data;
}

async function toolLookupCustomer(
  userClient: SupabaseClient,
  args: { query: string }
) {
  const query = (args.query ?? '').trim();
  if (!query) return { customers: [] };

  const { data, error } = await userClient
    .from('bookings')
    .select(
      'customer_name, mobile, booking_number, booking_date, price, pending, status, murti_name'
    )
    .or(
      `customer_name.ilike.%${query}%,mobile.ilike.%${query}%`
    )
    .order('booking_date', { ascending: false })
    .limit(20);

  if (error) throw error;

  const map = new Map<
    string,
    {
      customerName: string;
      mobile: string;
      lastBookingNumber: string;
      lastBookingDate: string;
      lastMurti: string | null;
      pending: number;
      status: string;
    }
  >();

  for (const row of data ?? []) {
    const key = String(row.mobile ?? '').trim();
    if (!key || map.has(key)) continue;
    map.set(key, {
      customerName: row.customer_name,
      mobile: key,
      lastBookingNumber: row.booking_number,
      lastBookingDate: row.booking_date,
      lastMurti: row.murti_name,
      pending: Number(row.pending),
      status: row.status,
    });
  }

  return {
    note: 'Full mobile included only for drafting WhatsApp. Never auto-send. Vendor must send manually.',
    customers: Array.from(map.values()).slice(0, 8),
  };
}

async function toolSalesAnalysis(
  userClient: SupabaseClient,
  args: { days?: number }
) {
  const days = Math.min(Math.max(Number(args.days) || 180, 30), 730);
  const { data, error } = await userClient.rpc('ai_get_sales_analysis', {
    p_days: days,
  });
  if (error) throw error;
  return data;
}

async function runTool(
  userClient: SupabaseClient,
  vendorId: string,
  name: string,
  argsJson: string
): Promise<{ result: unknown; poster?: PosterPayload }> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    args = {};
  }

  switch (name) {
    case 'get_dashboard_stats':
      return { result: await toolDashboardStats(userClient) };
    case 'search_bookings':
      return { result: await toolSearchBookings(userClient, args as never) };
    case 'list_customers':
      return { result: await toolListCustomers(userClient, args as never) };
    case 'get_pending_payments':
      return { result: await toolPendingPayments(userClient, args as never) };
    case 'get_murti_stock_insights':
      return { result: await toolMurtiStockInsights(userClient, args as never) };
    case 'get_vendor_profile':
      return { result: await toolVendorProfile(userClient, vendorId) };
    case 'lookup_customer':
      return {
        result: await toolLookupCustomer(userClient, args as { query: string }),
      };
    case 'get_sales_analysis':
      return { result: await toolSalesAnalysis(userClient, args as never) };
    case 'prepare_poster': {
      const poster: PosterPayload = {
        headline: String(args.headline ?? 'Ganpati Bappa Morya'),
        subheadline: args.subheadline ? String(args.subheadline) : undefined,
        body: args.body ? String(args.body) : undefined,
        cta: args.cta ? String(args.cta) : undefined,
        festival: args.festival ? String(args.festival) : undefined,
        language: (args.language as PosterPayload['language']) ?? 'en',
        style: (args.style as PosterPayload['style']) ?? 'festive',
      };
      return {
        result: {
          ok: true,
          message:
            'Poster brief prepared. The app will offer Generate Poster PDF / Share.',
          poster,
        },
        poster,
      };
    }
    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

async function callOpenAi(
  apiKey: string,
  messages: OpenAiMessage[],
  stream: boolean
): Promise<Response> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0.4,
      stream,
    }),
  });
  return res;
}

async function runToolLoop(
  apiKey: string,
  userClient: SupabaseClient,
  vendorId: string,
  messages: OpenAiMessage[],
  onPoster: (p: PosterPayload) => void
): Promise<{
  messages: OpenAiMessage[];
  assistantText: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}> {
  let current = [...messages];
  let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;

  for (let round = 0; round < 5; round++) {
    const res = await callOpenAi(apiKey, current, false);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    usage = data.usage ?? usage;
    const choice = data.choices?.[0];
    const msg = choice?.message as OpenAiMessage | undefined;
    if (!msg) throw new Error('Empty OpenAI response');

    current.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    const toolCalls = msg.tool_calls ?? [];
    if (!toolCalls.length) {
      return {
        messages: current,
        assistantText: (msg.content ?? '').trim(),
        usage,
      };
    }

    for (const call of toolCalls) {
      const { result, poster } = await runTool(
        userClient,
        vendorId,
        call.function.name,
        call.function.arguments ?? '{}'
      );
      if (poster) onPoster(poster);
      current.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  const lastAssistant = [...current]
    .reverse()
    .find((m) => m.role === 'assistant' && m.content);
  return {
    messages: current,
    assistantText: (lastAssistant?.content ?? 'I could not complete that request.').trim(),
    usage,
  };
}

/** Final answer pass with streaming after tools resolved. */
async function streamFinalAnswer(
  apiKey: string,
  messages: OpenAiMessage[],
  write: (chunk: string) => void
): Promise<{
  text: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}> {
  // Force no tools for clean text stream
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        ...messages,
        {
          role: 'system',
          content:
            'Respond now to the user with the final answer only. Do not call tools. Keep marketing drafts ready to copy/share.',
        },
      ],
      temperature: 0.5,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI stream error: ${res.status} ${errText.slice(0, 300)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('OpenAI stream body missing');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.usage) usage = parsed.usage;
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          fullText += delta;
          write(ndjsonLine({ type: 'delta', content: delta }));
        }
      } catch {
        // ignore partial JSON
      }
    }
  }

  return { text: fullText.trim(), usage };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    if (!supabaseUrl || !anonKey) {
      return jsonResponse({ error: 'Missing Supabase environment variables' }, 500);
    }
    if (!openaiKey) {
      return jsonResponse(
        {
          error:
            'AI is not configured. Set OPENAI_API_KEY as a Supabase Edge Function secret.',
        },
        503
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const vendorId = await getVendorId(userClient);
    if (!vendorId) {
      return jsonResponse(
        { error: 'No stall account linked to this login.' },
        403
      );
    }

    const { data: vendorRow, error: vendorError } = await userClient
      .from('vendors')
      .select('business_name, ai_enabled')
      .eq('id', vendorId)
      .single();

    if (vendorError) throw vendorError;
    if (vendorRow?.ai_enabled === false) {
      return jsonResponse(
        { error: 'AI Assistant is disabled in Settings.' },
        403
      );
    }

    const allowed = await checkRateLimit(userClient, vendorId, user.id);
    if (!allowed) {
      return jsonResponse(
        {
          error:
            'Hourly AI limit reached. Please try again later.',
        },
        429
      );
    }

    const body = (await req.json()) as ChatBody;
    const message = sanitizeUserMessage(body.message ?? '');
    if (!message) {
      return jsonResponse({ error: 'Message is required' }, 400);
    }

    let conversationId = body.conversationId?.trim() || null;

    if (conversationId) {
      const { data: existing, error: convError } = await userClient
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (convError) throw convError;
      if (!existing) {
        return jsonResponse({ error: 'Conversation not found' }, 404);
      }
    } else {
      const title =
        message.length > 48 ? `${message.slice(0, 45)}…` : message;
      const { data: created, error: createError } = await userClient
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title,
        })
        .select('id')
        .single();
      if (createError) throw createError;
      conversationId = created.id;
    }

    const { error: userMsgError } = await userClient.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    });
    if (userMsgError) throw userMsgError;

    const { data: history, error: historyError } = await userClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    if (historyError) throw historyError;

    const openaiMessages: OpenAiMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(vendorRow?.business_name ?? ''),
      },
      ...(history ?? [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    const posters: PosterPayload[] = [];
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const write = (text: string) => {
          controller.enqueue(encoder.encode(text));
        };

        try {
          write(ndjsonLine({ type: 'meta', conversationId }));

          // Tool loop (non-streaming), then stream final prose
          const { messages: afterTools, assistantText, usage: toolUsage } =
            await runToolLoop(
              openaiKey,
              userClient,
              vendorId,
              openaiMessages,
              (p) => {
                posters.push(p);
                write(ndjsonLine({ type: 'poster', payload: p }));
              }
            );

          let finalText = assistantText;
          let streamUsage = toolUsage;

          // If we already have text from the last assistant message without needing
          // another stream, still try streaming a polished final when tools ran.
          const hadTools = afterTools.some((m) => m.role === 'tool');
          if (hadTools || !finalText) {
            const streamed = await streamFinalAnswer(
              openaiKey,
              afterTools,
              write
            );
            // Prefer streamed text; fall back to tool-loop text
            if (streamed.text) finalText = streamed.text;
            streamUsage = streamed.usage ?? streamUsage;
          } else {
            // Progressive UX when no tools: emit text in chunks
            const chunkSize = 24;
            for (let i = 0; i < finalText.length; i += chunkSize) {
              write(
                ndjsonLine({
                  type: 'delta',
                  content: finalText.slice(i, i + chunkSize),
                })
              );
            }
          }

          if (!finalText) {
            finalText =
              'I could not generate a response. Please try again.';
          }

          // Attach poster summary for persistence if model forgot
          let contentToStore = finalText;
          if (posters.length > 0) {
            contentToStore = `${finalText}\n\n<!--POSTER:${JSON.stringify(posters[posters.length - 1])}-->`;
          }

          const { data: assistantMsg, error: assistantInsertError } =
            await userClient
              .from('ai_messages')
              .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: contentToStore,
              })
              .select('id')
              .single();

          if (assistantInsertError) throw assistantInsertError;

          await userClient
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

          await logRequest(userClient, {
            vendorId,
            userId: user.id,
            conversationId,
            model: MODEL,
            status: 'ok',
            promptTokens: streamUsage?.prompt_tokens,
            completionTokens: streamUsage?.completion_tokens,
          });

          write(
            ndjsonLine({
              type: 'done',
              messageId: assistantMsg.id,
              conversationId,
            })
          );
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          try {
            await logRequest(userClient, {
              vendorId,
              userId: user.id,
              conversationId,
              model: MODEL,
              status: 'error',
              errorMessage: msg.slice(0, 500),
            });
          } catch {
            // ignore log failure
          }
          write(ndjsonLine({ type: 'error', error: msg }));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 400);
  }
});
