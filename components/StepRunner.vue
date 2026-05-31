<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  skeleton: { type: String, default: '' },
  height:   { type: String, default: '280px' },
})

const LINE_H = 21   // must match CSS line-height
const PAD_T  = 12   // must match CSS padding-top

const code        = ref(props.skeleton)
const currentLine = ref(0)
const isDone      = ref(false)
const running     = ref(false)   // true after first step, before done
const logs        = ref([])
const errorMsg    = ref('')
const textareaRef = ref(null)
const gutterRef   = ref(null)

let progGen       = null
let innerFired    = false   // did __track fire on the current outer step?

const lineCount = computed(() => code.value.split('\n').length)
const arrowTop  = computed(() => PAD_T + (currentLine.value - 1) * LINE_H)

// Sync gutter scroll to textarea scroll
function syncScroll() {
  if (gutterRef.value && textareaRef.value)
    gutterRef.value.scrollTop = textareaRef.value.scrollTop
}

// Wrap user code in an outer generator.
// - Each top-level statement gets a `yield startLine` after it executes
// - Inner `yield` lines get __track(N); prepended so we know where the inner gen paused
function buildOuterGen(src) {
  const lines = src.split('\n')
  const out = ['function* __prog(__track, console) {']
  let depth = 0
  let stmtStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      out.push(line); continue
    }

    // Track where this top-level statement starts
    if (depth === 0 && stmtStart === -1) stmtStart = i + 1  // 1-indexed

    // Only instrument yields that are INSIDE nested functions (depth > 0)
    if (depth > 0 && /\byield\b/.test(trimmed)) {
      const indent = line.match(/^(\s*)/)[1]
      out.push(`${indent}__track(${i + 1}); ${trimmed}`)
    } else {
      out.push(line)
    }

    const opens  = (line.match(/{/g) || []).length
    const closes = (line.match(/}/g) || []).length
    depth += opens - closes

    if (depth === 0 && stmtStart !== -1) {
      out.push(`  yield ${stmtStart}`)   // yield = first line of the statement
      stmtStart = -1
    }
  }

  out.push('}')
  return out.join('\n')
}

function formatError(e) {
  const match = (e.stack || '').match(/<anonymous>:(\d+):(\d+)/)
  if (match) {
    const line = Math.max(1, parseInt(match[1]) - 2)
    const src  = (code.value.split('\n')[line - 1] || '').trim()
    return `${e.constructor.name} on line ${line} — ${e.message}\n  → ${src}`
  }
  return `${e.constructor.name}: ${e.message}`
}

function init() {
  const outerSrc = buildOuterGen(code.value)
  const fakeConsole = {
    log:   (...a) => logs.value.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
    error: (...a) => logs.value.push('✖ ' + a.join(' ')),
    warn:  (...a) => logs.value.push('⚠ ' + a.join(' ')),
  }
  const track = n => { currentLine.value = n; innerFired = true }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('__track', 'console', `${outerSrc}\nreturn __prog(__track, console)`)
    progGen = fn(track, fakeConsole)
    running.value = true
  } catch (e) {
    errorMsg.value = formatError(e)
    running.value = false
    progGen = null
  }
}

function step() {
  if (isDone.value) return

  if (!running.value) {
    // First press: init then take one step
    logs.value = []
    errorMsg.value = ''
    currentLine.value = 0
    isDone.value = false
    init()
    if (!running.value) return
  }

  innerFired = false
  try {
    const { value: outerLine, done } = progGen.next()
    if (!innerFired) currentLine.value = outerLine ?? 0
    if (done) { isDone.value = true; currentLine.value = 0 }
  } catch (e) {
    errorMsg.value = formatError(e)
    isDone.value = true
    currentLine.value = 0
  }
}

function reset() {
  progGen = null
  running.value = false
  isDone.value = false
  currentLine.value = 0
  logs.value = []
  errorMsg.value = ''
  code.value = props.skeleton
}
</script>

<template>
  <div class="step-runner">

    <!-- Editor: gutter + textarea -->
    <div class="editor-row" :style="{ height: props.height }">

      <div class="gutter" ref="gutterRef">
        <div
          v-if="currentLine > 0"
          class="arrow"
          :style="{ top: arrowTop + 'px' }"
        >→</div>
        <div
          v-for="n in lineCount" :key="n"
          class="line-num"
          :class="{ active: n === currentLine }"
        >{{ n }}</div>
      </div>

      <textarea
        ref="textareaRef"
        v-model="code"
        class="code-area"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        :disabled="running && !isDone"
        @scroll="syncScroll"
      />
    </div>

    <div v-if="errorMsg" class="error-bar"><pre>{{ errorMsg }}</pre></div>

    <!-- Controls -->
    <div class="control-bar">
      <button
        class="btn-step"
        :disabled="isDone"
        @click="step"
      >{{ isDone ? 'Done' : running ? '▶ Step' : '▶ Step' }}</button>

      <button class="btn-reset" @click="reset">↺ Reset</button>

      <span v-if="isDone" class="done-label">— generator exhausted</span>
    </div>

    <div v-if="logs.length" class="output-pane">
      <pre>{{ logs.join('\n') }}</pre>
    </div>

  </div>
</template>

<style scoped>
.step-runner {
  display: flex;
  flex-direction: column;
  border: 1px solid #313244;
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e2e;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  margin-bottom: 1.5rem;
}

.editor-row {
  display: flex;
  overflow: hidden;
}

/* Gutter */
.gutter {
  position: relative;
  width: 44px;
  flex-shrink: 0;
  background: #181825;
  border-right: 1px solid #313244;
  padding-top: 12px;     /* = PAD_T */
  overflow: hidden;
  user-select: none;
}

.line-num {
  height: 21px;           /* = LINE_H */
  line-height: 21px;
  text-align: right;
  padding-right: 8px;
  font-size: 11px;
  color: #45475a;
  transition: color 0.1s;
}

.line-num.active {
  color: #cba6f7;
  font-weight: bold;
}

.arrow {
  position: absolute;
  left: 4px;
  font-size: 13px;
  color: #cba6f7;
  line-height: 21px;     /* = LINE_H */
  transition: top 0.18s ease;
  pointer-events: none;
}

/* Textarea */
.code-area {
  flex: 1;
  background: #1e1e2e;
  color: #cdd6f4;
  border: none;
  padding: 12px 16px;    /* padding-top = PAD_T */
  font-family: inherit;
  font-size: 13px;
  line-height: 21px;     /* = LINE_H */
  resize: none;
  outline: none;
  tab-size: 2;
  white-space: pre;
  overflow-x: auto;
}

.code-area:disabled { opacity: 0.85; cursor: default; }

/* Error */
.error-bar {
  background: #3d1515;
  border-top: 1px solid #5d2020;
  padding: 5px 12px;
}
.error-bar pre {
  color: #f38ba8;
  font-family: inherit;
  font-size: 12px;
  margin: 0;
  white-space: pre-wrap;
}

/* Controls */
.control-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #181825;
  border-top: 1px solid #313244;
}

.btn-step {
  background: #a6e3a1;
  color: #1e1e2e;
  border: none;
  border-radius: 4px;
  padding: 3px 16px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
}
.btn-step:disabled { opacity: 0.35; cursor: default; }

.btn-reset {
  background: transparent;
  color: #6c7086;
  border: 1px solid #313244;
  border-radius: 4px;
  padding: 3px 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
}
.btn-reset:hover { color: #cdd6f4; border-color: #45475a; }

.done-label { color: #585b70; font-size: 11px; }

/* Output */
.output-pane {
  background: #11111b;
  border-top: 1px solid #313244;
  padding: 10px 16px;
  max-height: 100px;
  overflow-y: auto;
}
.output-pane pre {
  color: #a6e3a1;
  font-family: inherit;
  font-size: 12px;
  margin: 0;
  white-space: pre-wrap;
}
</style>
