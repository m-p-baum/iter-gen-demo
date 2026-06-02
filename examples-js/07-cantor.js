function* cantorSet() {
  let firstLevel = [[0, 1]]
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
  const colors = ['#cba6f7', '#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8', '#fab387']
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
