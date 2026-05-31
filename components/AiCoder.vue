<script setup>
import { ref } from 'vue'

const props = defineProps({
  skeleton: { type: String, default: '' },
  model: { type: String, default: 'qwen2.5-coder:7b' },
  height: { type: String, default: '240px' },
})

const prompt = ref('')
const code = ref(props.skeleton)
const output = ref('')
const loading = ref(false)
const errorMsg = ref('')
const showOutput = ref(false)

function stripFences(text) {
  return text.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim()
}

// LCS-based line diff — returns ops: { op: '='|'+'|'-', line? }
function diffLines(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])
  const ops = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { ops.unshift({ op: '=', line: b[j-1] }); i--; j-- }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { ops.unshift({ op: '+', line: b[j-1] }); j-- }
    else { ops.unshift({ op: '-' }); i-- }
  }
  return ops
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function animateDiff(oldCode, newCode) {
  if (oldCode === newCode) return
  const ops = diffLines(oldCode.split('\n'), newCode.split('\n'))
  const result = []
  for (let di = 0; di < ops.length; di++) {
    const { op, line } = ops[di]
    // tail = future unchanged lines — kept visible throughout so code doesn't disappear
    const tail = ops.slice(di + 1).filter(o => o.op === '=').map(o => o.line)
    if (op === '=') {
      result.push(line)
      code.value = [...result, ...tail].join('\n')
    } else if (op === '+') {
      for (let ci = 0; ci <= line.length; ci++) {
        code.value = [...result, line.slice(0, ci), ...tail].join('\n')
        await sleep(10)
      }
      result.push(line)
    }
    // '-': old line vanishes (already absent from tail)
  }
  code.value = result.join('\n')
}

async function askAI() {
  if (!prompt.value.trim() || loading.value) return
  loading.value = true
  errorMsg.value = ''
  showOutput.value = false

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: props.model,
        system: `You are a JavaScript coding assistant for a live teaching demo. Output only the complete updated JavaScript file — no markdown fences, no prose, no explanation. Current code:\n\n${code.value}`,
        prompt: prompt.value,
        stream: true,
      }),
    })

    if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.response) accumulated += data.response
        } catch { /* skip malformed JSON chunks */ }
      }
    }

    const newCode = stripFences(accumulated).trim()
    await animateDiff(code.value, newCode)
  } catch (e) {
    errorMsg.value = e.message.includes('Failed to fetch')
      ? 'Ollama not running — start it with: ollama serve'
      : e.message
  } finally {
    loading.value = false
  }
}

function errorLocation(e) {
  // V8 new Function wraps code with a 2-line header, so stack line - 2 = source line
  const match = (e.stack || '').match(/<anonymous>:(\d+):(\d+)/)
  if (!match) return null
  return { line: Math.max(1, parseInt(match[1]) - 2), col: parseInt(match[2]) }
}

function runCode() {
  showOutput.value = true
  const logs = []
  const fakeConsole = {
    log: (...args) => logs.push(args.map(a =>
      typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
    ).join(' ')),
    error: (...args) => logs.push('✖ ' + args.join(' ')),
    warn: (...args) => logs.push('⚠ ' + args.join(' ')),
  }
  try {
    // eslint-disable-next-line no-new-func
    new Function('console', code.value)(fakeConsole)
    output.value = logs.join('\n') || '(no console output)'
  } catch (e) {
    const loc = errorLocation(e)
    if (loc) {
      const src = (code.value.split('\n')[loc.line - 1] || '').trim()
      output.value = `Error (line ${loc.line}): ${e.message}\n  → ${src}`
    } else {
      output.value = `Error: ${e.message}`
    }
  }
}

function reset() {
  code.value = props.skeleton
  output.value = ''
  showOutput.value = false
  prompt.value = ''
  errorMsg.value = ''
}
</script>

<template>
  <div class="ai-coder">
    <!-- Prompt bar — styled like VS Code inline chat -->
    <div class="prompt-bar">
      <span class="spark">✦</span>
      <input
        v-model="prompt"
        class="prompt-input"
        placeholder="Ask AI to implement…"
        :disabled="loading"
        @keydown.enter="askAI"
      />
      <button class="btn-send" :disabled="loading || !prompt.trim()" @click="askAI">
        <span v-if="loading" class="dots">···</span>
        <span v-else>↵</span>
      </button>
    </div>

    <div v-if="errorMsg" class="error-bar">{{ errorMsg }}</div>

    <!-- Code editor area — textarea styled as dark editor -->
    <textarea
      v-model="code"
      class="code-area"
      :style="{ height: props.height }"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
    />

    <!-- Action bar -->
    <div class="action-bar">
      <button class="btn-run" :disabled="!code.trim()" @click="runCode">▶ Run</button>
      <button class="btn-reset" @click="reset">↺ Reset</button>
      <span v-if="loading" class="status">generating…</span>
    </div>

    <!-- Console output -->
    <div v-if="showOutput" class="output-pane">
      <pre>{{ output }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ai-coder {
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

/* Prompt bar */
.prompt-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: #252535;
  border-bottom: 1px solid #313244;
}

.spark {
  color: #cba6f7;
  font-size: 13px;
  flex-shrink: 0;
}

.prompt-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #cdd6f4;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  min-width: 0;
}

.prompt-input::placeholder {
  color: #585b70;
}

.prompt-input:disabled {
  opacity: 0.5;
}

.btn-send {
  background: #313244;
  border: 1px solid #45475a;
  color: #cba6f7;
  border-radius: 4px;
  padding: 2px 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  flex-shrink: 0;
  line-height: 1.4;
}

.btn-send:disabled {
  opacity: 0.35;
  cursor: default;
}

.dots {
  letter-spacing: 2px;
}

/* Error */
.error-bar {
  background: #3d1515;
  color: #f38ba8;
  padding: 5px 12px;
  font-size: 12px;
  border-bottom: 1px solid #5d2020;
}

/* Code textarea */
.code-area {
  width: 100%;
  background: #1e1e2e;
  color: #cdd6f4;
  border: none;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.65;
  resize: none;
  outline: none;
  box-sizing: border-box;
  tab-size: 2;
  white-space: pre;
  overflow-x: auto;
}

/* Action bar */
.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #181825;
  border-top: 1px solid #313244;
}

.btn-run {
  background: #a6e3a1;
  color: #1e1e2e;
  border: none;
  border-radius: 4px;
  padding: 3px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
}

.btn-run:disabled {
  opacity: 0.35;
  cursor: default;
}

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

.btn-reset:hover {
  color: #cdd6f4;
  border-color: #45475a;
}

.status {
  color: #585b70;
  font-size: 11px;
  margin-left: 4px;
}

/* Output pane */
.output-pane {
  background: #11111b;
  border-top: 1px solid #313244;
  padding: 10px 16px;
  max-height: 110px;
  overflow-y: auto;
}

.output-pane pre {
  color: #a6e3a1;
  font-family: inherit;
  font-size: 12px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
