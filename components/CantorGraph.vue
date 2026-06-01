<script setup>
import { computed } from 'vue'

const props = defineProps({
  levels: { type: Array, default: () => [] },  // array of segment arrays, one per level
})

const VW    = 1000
const PAD   = 20
const ROW_H = 52
const SW    = 9

const svgH = computed(() => PAD * 2 + Math.max(1, props.levels.length) * ROW_H)

function toX(v) { return PAD + v * (VW - PAD * 2) }

const levelColors = ['#cba6f7', '#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8', '#fab387']

const lines = computed(() =>
  props.levels.flatMap((segs, lvl) =>
    segs.map(([a, b]) => ({
      x1: toX(a), x2: toX(b),
      y: PAD + lvl * ROW_H + ROW_H / 2,
      color: levelColors[lvl % levelColors.length],
    }))
  )
)
</script>

<template>
  <div class="cantor-graph">
    <svg
      :viewBox="`0 0 ${VW} ${svgH}`"
      preserveAspectRatio="xMidYMid meet"
      class="svg"
    >
      <line
        v-for="(ln, i) in lines" :key="i"
        :x1="ln.x1" :y1="ln.y" :x2="ln.x2" :y2="ln.y"
        :stroke="ln.color"
        :stroke-width="SW"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.cantor-graph {
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  height: 100%;
}

.svg { width: 100%; height: 100%; display: block; }
</style>
