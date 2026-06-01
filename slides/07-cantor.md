---
class: overflow-y-auto
---

# Generator Demo — Cantor Set

<script setup>
import { ref } from 'vue'

// ── SVG proxy + step recording ─────────────────────────
const svgRef  = ref(null)
const draws   = []          // { step, ns, tag, attrs }
let captureStep = 0

const svgProxy = {
  appendChild(el) {
    const attrs = {}
    for (const a of el.attributes) attrs[a.name] = a.value
    draws.push({ step: captureStep, ns: el.namespaceURI, tag: el.tagName, attrs })
  },
}

const context = {
  svg: svgProxy,
  __onStep(idx) { captureStep = idx },
}

// replay draws up to (and including) the given step index
function replay(maxStep) {
  if (!svgRef.value) return
  svgRef.value.innerHTML = ''
  for (const d of draws) {
    if (d.step > maxStep) break
    const el = document.createElementNS(d.ns, d.tag)
    for (const [k, v] of Object.entries(d.attrs)) el.setAttribute(k, v)
    svgRef.value.appendChild(el)
  }
}

function onDebugChange(data) {
  if (!data) { draws.length = 0; captureStep = 0; if (svgRef.value) svgRef.value.innerHTML = ''; return }
  replay(data.step)
}

// ── code skeleton ──────────────────────────────────────
const cantorCode = `

function* cantorSet() {
  let firstLevel =  [[0,1]]
  drawLevel(firstLevel, 1)
  yield
  let secondLevel = removeMiddleThirds(firstLevel)
  drawLevel(secondLevel, 2)
  yield
}

const gen = cantorSet()
gen.next()

function removeMiddleThirds(segments) {
  return segments.flatMap(([a, b]) => {
    const t = (b - a) / 3
    return [[a, a + t], [b - t, b]]
  })
}

function drawLevel(segments, level) {
  const colors = ['#cba6f7','#89b4fa','#a6e3a1','#f9e2af','#f38ba8','#fab387']
  const W = 500, pad = 16, rowH = 50
  segments.forEach(([a, b]) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', pad + a * (W - pad * 2))
    line.setAttribute('x2', pad + b * (W - pad * 2))
    const y = pad + (level - 1) * rowH + rowH / 2
    line.setAttribute('y1', y)
    line.setAttribute('y2', y)
    line.setAttribute('stroke', colors[level % colors.length])
    line.setAttribute('stroke-width', 8)
    line.setAttribute('stroke-linecap', 'round')
    svg.appendChild(line)
  })
}

`
</script>

<div class="flex gap-3 items-stretch mt-2">
  <div class="flex-1 min-w-0">
    <CodeDebugger
      :skeleton="cantorCode"
      filename="cantor.js"
      :show-inspector="false"
      :context="context"
      @change="onDebugChange"
    />
  </div>
  <div style="width: 300px; flex-shrink: 0;">
    <div class="graph-area">
      <svg ref="svgRef" viewBox="0 0 500 330" preserveAspectRatio="xMinYMin meet" width="100%" height="100%" />
    </div>
  </div>
</div>

<style scoped>
.graph-area {
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  height: 100%;
}
</style>
