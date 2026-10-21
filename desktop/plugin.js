/**
  * Token Stats — v4.3 (panel docks into the right sidebar, beside the file browser)
 *
 * Statistics objects, by design:
  *   - Panel "Session" section — the FOCUSED CHAT SESSION, read live from
  *     `host.state.focusedUsage` (UsageStats the backend streams: calls,
  *     input/output/total, avg_tps, cache_hit_pct, compressions, context_*,
  *     cost_usd). Null while no session is focused/resolved.
 *   - Panel "Recent Turns" — per-turn detail from the gateway event tap
 *     (model, tokens, tok/s, TTFT, time). Turn metrics (TTFT, decode
 *     window) only exist per turn, so they stay event-derived.
 *   - Chip — the FOCUSED CHAT SESSION with FULL STATS INLINE (no tooltip):
 *     `⚡ ↑in ↓out · $cost · N calls · tok/s · ctx used/max`, live from
 *     `host.state.focusedUsage`.
 *   - Deliberately NO cross-session/cross-model cumulative: that was the
 *     misleading v3.0 "Session Totals" — replaced by true session data.
 *
 * Loader contract (verified against apps/desktop/src/{sdk,contrib}):
 *   - default-export `{ id, name, description?, defaultEnabled?, register(ctx) }`
 *   - imports restricted to `@hermes/plugin-sdk` + `react*` (sdk/runtime.ts)
 *   - areas: `statusBar.left|right`, `panes`, `titleBar.*` (sdk/areas.ts)
 *   - `jsx(type, props, key)` / `jsxs(type, props, key)`: children live in
 *     `props.children` only; single child → `jsx`, array → `jsxs`.
 *   - nanostores `atom.set(v)` assigns `v` directly; always a fresh object.
 */
import { atom, host, useValue } from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'token-stats'

// ── formatting ─────────────────────────────────────────────────────────────
const num = (n) => (n == null ? '\u2014' : Number(n).toLocaleString('en-US'))
const secs = (s) => (s == null ? '\u2014' : Number(s).toFixed(1) + 's')
const money = (c) => (c == null ? '\u2014' : '$' + Number(c).toFixed(4))

// ── theme (inline styles via app CSS vars; disk plugins get no Tailwind) ───
const MONO = "'JetBrains Mono','SF Mono','Fira Code','Cascadia Code',Consolas,monospace"
const FG = 'var(--ui-text-primary, var(--foreground))'
const MUT = 'var(--ui-text-secondary, var(--muted-foreground))'
const TER = 'var(--ui-text-tertiary)'
const BORDER = 'var(--border)'
const SUBTLE = 'var(--chrome-action-hover, var(--background-subtle))'

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  padding: '5px 0',
  borderBottom: `1px solid ${BORDER}`,
}
const labelStyle = { fontFamily: MONO, color: TER, fontSize: '12px' }
const valueStyle = { fontFamily: MONO, color: FG, fontSize: '13px', fontWeight: 600 }
const headerStyle = {
  fontFamily: MONO,
  color: TER,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '16px 0 4px',
  opacity: 0.7,
}

// ── pure presentational pieces (no hooks; data via props) ──────────────────
function Row(props) {
  return jsxs('div', {
    style: rowStyle,
    children: [
      jsx('span', { style: labelStyle, children: props.label }),
      jsx('span', { style: valueStyle, children: props.value == null ? '\u2014' : props.value }),
    ],
  })
}

function SectionLabel(props) {
  return jsx('div', { style: headerStyle, children: props.children })
}

 // ── chip: FOCUSED SESSION — full stats inline (no tooltip) ────────────────
 function Chip(props) {
   const u = useValue(host.state.focusedUsage)
   const has = u != null && (u.input > 0 || u.output > 0)
 
   let text = '\u26a1 \u2191\u2014 \u2193\u2014'
   if (has) {
     const parts = [`\u2191${num(u.input)} \u2193${num(u.output)}`]
     if (u.cost_usd != null) parts.push(money(u.cost_usd))
     if (u.calls != null) parts.push(num(u.calls) + ' calls')
     if (u.avg_tps != null) parts.push(Math.round(u.avg_tps) + ' tok/s')
     if (u.context_used != null) {
       parts.push('ctx ' + num(u.context_used) + (u.context_max != null ? '/' + num(u.context_max) : ''))
     }
     text = '\u26a1 ' + parts.join(' \u00b7 ')
   }
 
   return jsx('span', {
     style: {
       fontFamily: MONO,
       fontSize: '11px',
       color: has ? MUT : TER,
       display: 'inline-flex',
       alignItems: 'center',
       gap: '5px',
       padding: '2px 8px',
       borderRadius: '4px',
       background: has ? SUBTLE : 'transparent',
       whiteSpace: 'nowrap',
     },
     children: text,
   })
 }

// ── panel: focused session (host UsageStats) + recent turns ────────────────
function SessionSection() {
  const u = useValue(host.state.focusedUsage)

  if (u == null) {
    return jsx('div', {
      style: { fontFamily: MONO, color: TER, padding: '12px 0', fontSize: '12px' },
      children: 'No focused session \u2014 pick a chat to see its token usage.',
    })
  }

  const context =
    u.context_used != null
      ? num(u.context_used) +
        (u.context_max != null ? ' / ' + num(u.context_max) : '') +
        (u.context_percent != null ? ` (${Math.round(u.context_percent)}%)` : '')
      : null

  return jsxs('div', {
    children: [
      jsx(Row, { label: 'API Calls', value: num(u.calls) }),
      jsx(Row, { label: 'Input Tokens', value: num(u.input) }),
      jsx(Row, { label: 'Output Tokens', value: num(u.output) }),
      jsx(Row, { label: 'Total Tokens', value: num(u.total) }),
      jsx(Row, { label: 'Decode Avg', value: u.avg_tps != null ? Math.round(u.avg_tps) + ' tok/s' : null }),
      jsx(Row, { label: 'Cache Hit', value: u.cache_hit_pct != null ? Math.round(u.cache_hit_pct) + '%' : null }),
      jsx(Row, { label: 'Compressions', value: u.compressions != null ? num(u.compressions) : null }),
      jsx(Row, { label: 'Context', value: context }),
      jsx(Row, { label: 'Cost', value: money(u.cost_usd) }),
    ],
  })
}

function RecentTurns(props) {
  const s = useValue(props.store)
  const hist = s.history

  if (hist.length === 0) {
    return jsx('div', {
      style: { fontFamily: MONO, color: TER, padding: '12px 0', fontSize: '12px' },
      children: 'No turns recorded yet.',
    })
  }

  const cell = (align) => ({
    fontFamily: MONO,
    padding: '4px 6px',
    fontSize: '11px',
    textAlign: align,
  })

  return jsxs('table', {
    style: { width: '100%', borderCollapse: 'collapse', marginTop: '4px' },
    children: [
      jsx('thead', {
        children: jsxs('tr', {
          children: ['#', 'Model', 'In', 'Out', 'tok/s', 'TTFT', 'Time'].map((h, i) =>
            jsx(
              'th',
              {
                style: {
                  ...cell(i === 0 || i === 1 ? 'left' : 'right'),
                  color: TER,
                  fontSize: '10px',
                  fontWeight: 600,
                  borderBottom: `1px solid ${BORDER}`,
                },
                children: h,
              },
              h,
            ),
          ),
        }),
      }),
      jsxs('tbody', {
        children: hist
          .slice()
          .reverse()
          .map((e, i) =>
            jsxs(
              'tr',
              {
                style: { background: i % 2 === 0 ? 'transparent' : SUBTLE },
                children: [
                  jsx('td', { style: { ...cell('left'), color: MUT }, children: String(hist.length - i) }),
                  jsx('td', { style: { ...cell('left'), color: MUT }, children: e.model || '\u2014' }),
                  jsx('td', { style: { ...cell('right'), color: FG }, children: num(e.input) }),
                  jsx('td', { style: { ...cell('right'), color: FG }, children: num(e.out) }),
                  jsx('td', { style: { ...cell('right'), color: MUT }, children: e.tps != null ? String(Math.round(e.tps)) : '\u2014' }),
                  jsx('td', { style: { ...cell('right'), color: MUT }, children: secs(e.ttft) }),
                  jsx('td', { style: { ...cell('right'), color: TER }, children: secs(e.dur) }),
                ],
              },
              String(e.ts),
            ),
          ),
      }),
    ],
  })
}

function Panel(props) {
  return jsxs('div', {
    style: { padding: '12px 16px', height: '100%', overflowY: 'auto', boxSizing: 'border-box', maxWidth: '32rem' },
    children: [
      jsx('div', {
        style: { fontFamily: MONO, color: FG, fontSize: '14px', fontWeight: 700, marginBottom: '12px' },
        children: '\u26a1 Token Analytics',
      }),
      jsx(SectionLabel, { children: 'Focused Session' }),
      jsx(SessionSection, {}),
      jsx(SectionLabel, { children: 'Recent Turns' }),
      jsx(RecentTurns, { store: props.store }),
    ],
  })
}

// ── plugin ───────────────────────────────────────────────────────────────────
export default {
  id: ID,
  name: 'Token Stats',
   description: 'Focused-session token usage (host UsageStats) plus per-turn TTFT and decode throughput.',
  defaultEnabled: true,

  register(ctx) {
    // Seed turn store from persisted state (feature-safe; old v3 bundles are
    // simply read minus their now-unused `cum` key).
    let persisted = { current: null, history: [] }
    try {
      if (typeof ctx.storage?.get === 'function') {
        const p = ctx.storage.get('bundle', null)
        if (p && typeof p === 'object') persisted = { ...persisted, ...p }
      }
    } catch (_) {}

    const store = atom({
      current: persisted.current ?? null,
      history: Array.isArray(persisted.history) ? persisted.history : [],
    })
    const timing = { start: null, fd: null, ld: null }

    const persist = () => {
      try {
        const s = store.get()
        ctx.storage?.set?.('bundle', { current: s.current, history: s.history })
      } catch (_) {}
    }

    // Subscribe only if the host exposes the event tap (guard for older shells).
    if (typeof ctx.onEvent === 'function') {
      ctx.onEvent('message.start', () => {
        timing.start = performance.now()
        timing.fd = null
        timing.ld = null
      })

      ctx.onEvent('message.delta', () => {
        const now = performance.now()
        if (timing.fd === null) timing.fd = now
        timing.ld = now
      })

      ctx.onEvent('message.complete', (ev) => {
        const usage = (ev && ev.payload && ev.payload.usage) || null
        if (timing.start == null || !usage) return

        const input = usage.input ?? usage.prompt ?? 0
        const out = usage.output ?? usage.completion ?? 0
        const ttft = timing.fd != null ? (timing.fd - timing.start) / 1000 : null
        const durSec = (performance.now() - timing.start) / 1000
        const dw =
          timing.fd != null && timing.ld != null && timing.ld > timing.fd
            ? (timing.ld - timing.fd) / 1000
            : null
        const tps =
          usage.avg_tps != null
            ? usage.avg_tps
            : dw != null && out > 0
              ? out / dw
              : null

        const entry = {
          ts: Date.now(),
          input,
          out,
          ttft,
          tps,
          dur: durSec,
          model: usage.model || null,
        }

        // Assign a NEW object (nanostores compares by reference).
        const prev = store.get()
        store.set({
          current: entry,
          history: [...prev.history, entry].slice(-50),
        })
        persist()
      })
    }

    // ── contributions ────────────────────────────────────────────────────
    ctx.register({
      id: 'chip',
      area: 'statusBar.right',
      order: 110,
       render: () => jsx(Chip, {}),
    })

     ctx.register({
       id: 'panel',
       area: 'panes',
       order: 60,
       title: 'Token Analytics',
       // Live in the RIGHT SIDEBAR: same zone + visibility toggle as the
       // file browser (placement 'right' is that sidebar; dock stacks us
       // into its FILES | TOKEN ANALYTICS tab strip). `enforce` re-homes the
       // pane at every boot (mid-session user drags stick until next launch).
       data: {
         placement: 'right',
         dock: { pane: 'files', pos: 'center', enforce: true },
         collapsible: true,
         width: '320px',
         minWidth: '280px',
         maxWidth: '480px',
       },
       render: () => jsx(Panel, { store }),
     })
  },
}
