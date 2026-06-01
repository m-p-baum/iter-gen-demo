<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import * as BabelNS from '@babel/standalone'

const Babel = BabelNS.default || BabelNS

const props = defineProps({
  skeleton:  { type: String,  default: '' },
  height:    { type: String,  default: null },
  filename:  { type: String,  default: 'scratch.js' },
  stepLimit: { type: Number,  default: 2000 },
  showInspector: { type: Boolean, default: true },
  context:   { type: Object,  default: () => ({}) },  // extra vars injected into sandbox
})

const emit = defineEmits(['change'])

// Layout constants — MUST match the CSS below
const LINE_H = 20   // px per line
const PAD_T  = 12   // px top padding of editor

// ── state ──────────────────────────────────────────────
const code        = ref(props.skeleton)
const scrollTop   = ref(0)
const breakpoints = ref([])     // 1-indexed line numbers
const trace       = ref([])     // [{ line, vars, logCount, done?, error?, limit? }]
const logs        = ref([])     // [{ type, text }]
const currentStep = ref(-1)     // index into trace; -1 = not started
const buildError  = ref('')     // syntax / instrumentation error
const taRef       = ref(null)

// ── instrumentation (validated in isolation) ───────────
let pluginReady = false
function ensurePlugin() {
  if (pluginReady) return
  Babel.registerPlugin('step-tracer', stepTracer)
  pluginReady = true
}

function stepTracer({ types: t }) {
  return {
    visitor: {
      Statement(path) {
        const node = path.node
        if (node.__isStepCall) { path.skip(); return }     // never descend into a thunk
        if (node.__stepInstrumented) return
        if (!node.loc || !path.inList) return
        if (t.isBlockStatement(node) || t.isFunctionDeclaration(node) || t.isEmptyStatement(node)) return

        const line  = node.loc.start.line
        const names = Object.keys(path.scope.getAllBindings()).filter(n => !n.startsWith('__'))

        // function(){ var __s={}; try{__s["x"]=x}catch(__e){} ... return __s }
        const body = [t.variableDeclaration('var', [
          t.variableDeclarator(t.identifier('__s'), t.objectExpression([])),
        ])]
        for (const n of names) {
          body.push(t.tryStatement(
            t.blockStatement([t.expressionStatement(t.assignmentExpression('=',
              t.memberExpression(t.identifier('__s'), t.stringLiteral(n), true),
              t.identifier(n)))]),
            t.catchClause(t.identifier('__e'), t.blockStatement([]))))
        }
        body.push(t.returnStatement(t.identifier('__s')))
        const thunk = t.functionExpression(null, [], t.blockStatement(body))

        const call = t.expressionStatement(t.callExpression(
          t.identifier('__step'), [t.numericLiteral(line), thunk]))
        call.__isStepCall = true
        node.__stepInstrumented = true
        path.insertBefore(call)
      },
    },
  }
}

function instrument(src) {
  ensurePlugin()
  return Babel.transform(src, {
    sourceType: 'unambiguous',
    plugins: ['step-tracer'],
    babelrc: false,
    configFile: false,
    compact: false,
  }).code
}

// ── value preview (safe, no side effects on generators) ─
function preview(v, depth = 0, seen = new Set()) {
  const ty = typeof v
  if (v === null) return 'null'
  if (ty === 'undefined') return 'undefined'
  if (ty === 'number' || ty === 'boolean') return String(v)
  if (ty === 'bigint') return String(v) + 'n'
  if (ty === 'string') return `"${v}"`
  if (ty === 'symbol') return v.toString()
  if (ty === 'function') {
    const star = v.constructor && v.constructor.name === 'GeneratorFunction'
    return `${star ? 'ƒ*' : 'ƒ'} ${v.name || '(anonymous)'}()`
  }
  if (seen.has(v)) return '[Circular]'
  const tag = Object.prototype.toString.call(v).slice(8, -1)
  if (tag === 'Generator') return 'Generator {<suspended>}'
  if (tag === 'Map')  return `Map(${v.size})`
  if (tag === 'Set')  return `Set(${v.size})`
  if (tag === 'Promise') return 'Promise'
  if (depth >= 2) return tag === 'Array' ? `Array(${v.length})` : '{…}'
  seen.add(v)
  try {
    if (tag === 'Array') {
      const items = v.slice(0, 6).map(x => preview(x, depth + 1, seen))
      const more = v.length > 6 ? `, …${v.length}` : ''
      return `[${items.join(', ')}${more}]`
    }
    const keys = Object.keys(v)
    const shown = keys.slice(0, 6).map(k => {
      try { return `${k}: ${preview(v[k], depth + 1, seen)}` }
      catch { return `${k}: <error>` }
    })
    const more = keys.length > 6 ? ', …' : ''
    const cname = v.constructor && v.constructor.name
    const label = cname && cname !== 'Object' ? cname + ' ' : ''
    return `${label}{${shown.join(', ')}${more}}`
  } finally {
    seen.delete(v)
  }
}
const pv = v => preview(v, 0)

// ── build the execution trace ──────────────────────────
function buildTrace() {
  buildError.value = ''
  const newTrace = []
  const newLogs  = []
  let steps = 0
  let lastLine = 0
  let lastVars = {}

  const mkLog = type => (...args) => newLogs.push({
    type,
    text: args.map(a => (a !== null && typeof a === 'object') ? preview(a, 0) : String(a)).join(' '),
  })
  const sandboxConsole = {
    log: mkLog('log'), info: mkLog('log'),
    warn: mkLog('warn'), error: mkLog('error'),
  }

  // pull __onStep out of context — it's a hook, not an injected var
  const ctxOnStep = props.context?.__onStep
  const ctxKeys   = Object.keys(props.context ?? {}).filter(k => k !== '__onStep')
  const ctxVals   = ctxKeys.map(k => props.context[k])

  const __step = (line, thunk) => {
    if (++steps > props.stepLimit) { const e = new Error('step limit'); e.__limit = true; throw e }
    lastLine = line
    try { lastVars = thunk() } catch { lastVars = {} }
    newTrace.push({ line, vars: lastVars, logCount: newLogs.length })
    ctxOnStep?.(newTrace.length - 1)   // tell context which step index just fired
  }

  let src
  try {
    src = instrument(code.value)
  } catch (e) {
    buildError.value = (e && e.message) ? e.message.replace(/^unknown: /, '') : 'Syntax error'
    trace.value = []; logs.value = []; currentStep.value = -1
    return
  }

  try {
    // eslint-disable-next-line no-new-func
    new Function('__step', 'console', ...ctxKeys, src)(__step, sandboxConsole, ...ctxVals)
    newTrace.push({ line: null, done: true, logCount: newLogs.length, vars: lastVars })
  } catch (e) {
    if (e && e.__limit) {
      newTrace.push({ line: null, done: true, limit: true, logCount: newLogs.length, vars: lastVars })
    } else {
      const srcLine = (code.value.split('\n')[lastLine - 1] || '').trim()
      const msg = `${e && e.name ? e.name : 'Error'}: ${e && e.message ? e.message : e}`
        + (lastLine ? `\n  → line ${lastLine}: ${srcLine}` : '')
      newTrace.push({ line: lastLine || null, done: true, error: msg, logCount: newLogs.length, vars: lastVars })
    }
  }

  trace.value = newTrace
  logs.value  = newLogs
  currentStep.value = newTrace.length ? 0 : -1
}

// ── derived view state ─────────────────────────────────
const lineCount    = computed(() => code.value.split('\n').length)
const editorHeight = computed(() =>
  props.height ?? `${PAD_T * 2 + lineCount.value * LINE_H}px`)
const hasTrace     = computed(() => trace.value.length > 0)
const currentEntry = computed(() =>
  currentStep.value >= 0 && currentStep.value < trace.value.length
    ? trace.value[currentStep.value] : null)
const currentLine  = computed(() => currentEntry.value?.line ?? 0)
const lineIdx      = computed(() => currentLine.value > 0 ? currentLine.value - 1 : -1)
const hlTop        = computed(() => PAD_T + lineIdx.value * LINE_H)
const isError      = computed(() => !!currentEntry.value?.error)

const varEntries = computed(() => {
  const v = currentEntry.value?.vars || {}
  return Object.keys(v).map(k => ({ name: k, val: v[k] }))
})
const visibleLogs = computed(() => {
  if (!currentEntry.value) return []
  return logs.value.slice(0, currentEntry.value.logCount ?? logs.value.length)
})
const statusText = computed(() => {
  if (!hasTrace.value) return 'ready — press Run'
  const e = currentEntry.value
  if (!e) return ''
  if (e.error) return 'runtime error'
  if (e.limit) return `step limit (${props.stepLimit}) reached`
  if (e.done)  return 'finished ✓'
  return `line ${e.line}  ·  step ${currentStep.value + 1} / ${trace.value.length}`
})

// ── controls ───────────────────────────────────────────
function run()       { buildTrace() }
function stepInto()  { if (hasTrace.value && currentStep.value < trace.value.length - 1) currentStep.value++ }
function stepBack()  { if (hasTrace.value && currentStep.value > 0) currentStep.value-- }
function continueRun() {
  if (!hasTrace.value) return
  for (let j = currentStep.value + 1; j < trace.value.length; j++) {
    const ln = trace.value[j].line
    if (ln && breakpoints.value.includes(ln)) { currentStep.value = j; return }
  }
  currentStep.value = trace.value.length - 1   // no breakpoint ahead → run to end
}
function toggleBp(n) {
  breakpoints.value = breakpoints.value.includes(n)
    ? breakpoints.value.filter(x => x !== n)
    : [...breakpoints.value, n]
}
const isBp = n => breakpoints.value.includes(n)

function reset() {
  code.value = props.skeleton
  trace.value = []; logs.value = []; currentStep.value = -1
  breakpoints.value = []; buildError.value = ''; scrollTop.value = 0
}
function onScroll(e) { scrollTop.value = e.target.scrollTop }

// editing invalidates the trace — re-run to rebuild
watch(code, () => {
  if (hasTrace.value || buildError.value) {
    trace.value = []; logs.value = []; currentStep.value = -1; buildError.value = ''
  }
})

// inspector toggle
const showSide = ref(props.showInspector)

// emit current vars whenever the step changes (for external viz components)
watch(currentStep, () => {
  emit('change', currentEntry.value ? { step: currentStep.value, vars: currentEntry.value.vars ?? {} } : null)
})
watch(hasTrace, v => { if (!v) emit('change', null) })
</script>

<template>
  <div class="dbg">
    <!-- title bar -->
    <div class="titlebar">
      <span class="tl red" /><span class="tl yellow" /><span class="tl green" />
      <span class="file">{{ filename }}</span>
      <span class="grow" />
      <span class="lang">JavaScript · time-travel debugger</span>
    </div>

    <div class="main">
      <!-- ── editor column ── -->
      <div class="editor-col">
        <div class="editor-row" :style="{ height: editorHeight }">
          <!-- gutter: breakpoints + arrow + line numbers -->
          <div class="gutter">
            <div class="gutter-scroll" :style="{ transform: `translateY(${-scrollTop}px)` }">
              <div
                v-for="n in lineCount" :key="n"
                class="line-row"
                :class="{ active: n === currentLine }"
                @click="toggleBp(n)"
              >
                <span class="bp" :class="{ on: isBp(n) }" />
                <span class="arrow">{{ n === currentLine ? '▸' : '' }}</span>
                <span class="num">{{ n }}</span>
              </div>
            </div>
          </div>

          <!-- code surface: highlight bar behind a transparent textarea -->
          <div class="code-wrap">
            <div class="hl-layer">
              <div
                v-if="lineIdx >= 0"
                class="hl-bar"
                :class="{ err: isError }"
                :style="{ top: hlTop + 'px', transform: `translateY(${-scrollTop}px)` }"
              />
            </div>
            <textarea
              ref="taRef"
              v-model="code"
              class="code-area"
              spellcheck="false" autocorrect="off" autocapitalize="off"
              @scroll="onScroll"
            />
          </div>
        </div>

        <!-- controls -->
        <div class="toolbar">
          <button class="b run" @click="run">▶ {{ hasTrace ? 'Restart' : 'Run' }}</button>
          <button class="b" :disabled="!hasTrace || currentStep <= 0" @click="stepBack">↑ Back</button>
          <button class="b step" :disabled="!hasTrace || currentStep >= trace.length - 1" @click="stepInto">↓ Step</button>
          <button class="b" :disabled="!hasTrace || currentStep >= trace.length - 1" @click="continueRun">⏩ Continue</button>
          <button class="b ghost" @click="reset">↺ Reset</button>
          <span class="status" :class="{ err: isError }">{{ statusText }}</span>
          <button class="b ghost side-toggle" @click="showSide = !showSide" :title="showSide ? 'Hide inspector' : 'Show inspector'">{{ showSide ? '⊟' : '⊞' }}</button>
        </div>

        <div v-if="buildError" class="errbar"><pre>{{ buildError }}</pre></div>
        <div v-else-if="isError" class="errbar"><pre>{{ currentEntry.error }}</pre></div>
      </div>

      <!-- ── inspector column ── -->
      <div v-show="showSide" class="side">
        <div class="panel">
          <div class="panel-h">Variables</div>
          <div class="panel-b">
            <div v-if="!varEntries.length" class="muted">— none in scope —</div>
            <div v-for="v in varEntries" :key="v.name" class="var">
              <span class="vk">{{ v.name }}</span>
              <span class="vv">{{ pv(v.val) }}</span>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-h">Console</div>
          <div class="panel-b">
            <div v-if="!visibleLogs.length" class="muted">— no output yet —</div>
            <div v-for="(l, i) in visibleLogs" :key="i" class="logline" :class="l.type">{{ l.text }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dbg {
  border: 1px solid #313244;
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e2e;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  margin-bottom: 1.5rem;
}

/* title bar */
.titlebar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  background: #181825;
  border-bottom: 1px solid #313244;
}
.tl { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
.tl.red { background: #f38ba8; } .tl.yellow { background: #f9e2af; } .tl.green { background: #a6e3a1; }
.file { color: #cdd6f4; font-size: 12px; margin-left: 6px; }
.grow { flex: 1; }
.lang { color: #585b70; font-size: 11px; }

/* layout */
.main { display: flex; align-items: stretch; }
.editor-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.editor-row { display: flex; overflow: hidden; }

/* gutter */
.gutter {
  position: relative; width: 52px; flex-shrink: 0;
  background: #181825; border-right: 1px solid #313244;
  overflow: hidden; user-select: none;
}
.gutter-scroll { padding-top: 12px; }       /* = PAD_T */
.line-row {
  display: flex; align-items: center; gap: 2px;
  height: 20px; line-height: 20px;          /* = LINE_H */
  cursor: pointer;
}
.line-row .bp {
  width: 8px; height: 8px; border-radius: 50%;
  margin-left: 4px; flex-shrink: 0; background: transparent;
}
.line-row:hover .bp { background: #45323a; }
.line-row .bp.on { background: #f38ba8 !important; box-shadow: 0 0 4px #f38ba8; }
.line-row .arrow { width: 10px; color: #cba6f7; font-size: 11px; }
.line-row .num {
  flex: 1; text-align: right; padding-right: 8px;
  font-size: 11px; color: #45475a;
}
.line-row.active .num { color: #cba6f7; font-weight: 700; }

/* code surface */
.code-wrap { position: relative; flex: 1; min-width: 0; overflow: hidden; }
.hl-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.hl-bar {
  position: absolute; left: 0; right: 0; height: 20px;     /* = LINE_H */
  background: rgba(203, 166, 247, 0.13);
  border-left: 2px solid #cba6f7;
}
.hl-bar.err {
  background: rgba(243, 139, 168, 0.14);
  border-left-color: #f38ba8;
}
.code-area {
  position: absolute; inset: 0; width: 100%; height: 100%;
  background: transparent; color: #cdd6f4;
  border: none; outline: none; resize: none;
  padding: 12px 14px;                /* top = PAD_T */
  font-family: inherit; font-size: 13px;
  line-height: 20px;                 /* = LINE_H */
  tab-size: 2; white-space: pre; overflow-x: auto; overflow-y: hidden;
  box-sizing: border-box;
}

/* toolbar */
.toolbar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  background: #181825; border-top: 1px solid #313244;
}
.b {
  background: #313244; color: #cdd6f4;
  border: 1px solid #45475a; border-radius: 4px;
  padding: 3px 10px; cursor: pointer;
  font-family: inherit; font-size: 12px;
}
.b:hover:not(:disabled) { border-color: #585b70; }
.b:disabled { opacity: 0.3; cursor: default; }
.b.run  { background: #a6e3a1; color: #1e1e2e; border-color: #a6e3a1; font-weight: 700; }
.b.step { background: #89b4fa; color: #1e1e2e; border-color: #89b4fa; font-weight: 700; }
.b.ghost { background: transparent; color: #6c7086; }
.status { margin-left: auto; color: #585b70; font-size: 11px; }
.side-toggle { margin-left: 4px; font-size: 14px; padding: 1px 6px; }
.status.err { color: #f38ba8; }

/* error */
.errbar { background: #3d1515; border-top: 1px solid #5d2020; padding: 5px 12px; }
.errbar pre { margin: 0; color: #f38ba8; font-size: 12px; white-space: pre-wrap; font-family: inherit; }

/* inspector */
.side {
  width: 248px; flex-shrink: 0;
  display: flex; flex-direction: column;
  background: #11111b; border-left: 1px solid #313244;
}
.panel { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.panel + .panel { border-top: 1px solid #313244; }
.panel-h {
  padding: 5px 12px; font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase; color: #6c7086;
  background: #181825; border-bottom: 1px solid #313244;
}
.panel-b { flex: 1; min-height: 0; overflow: auto; padding: 8px 12px; }
.muted { color: #45475a; font-size: 12px; font-style: italic; }
.var { display: flex; gap: 8px; font-size: 12px; line-height: 1.7; }
.vk { color: #f9e2af; flex-shrink: 0; }
.vv { color: #cdd6f4; word-break: break-word; }
.logline { font-size: 12px; line-height: 1.6; color: #a6e3a1; white-space: pre-wrap; word-break: break-word; }
.logline.warn  { color: #f9e2af; }
.logline.error { color: #f38ba8; }
</style>
