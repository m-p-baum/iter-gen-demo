function* generator() {
  console.log('start')
  yield
  console.log('run this code')
  yield
  console.log('now this code')
  yield
  console.log('...and scene')
  return
}

const gen = generator()
console.log('a')
gen.next()

// --- Generators — Structure ---

function* smallNumbers() {
  let y1 = yield 1

  let y2 = yield 2

  let y3 = yield 3

  return 4
}

const gen2 = smallNumbers()
console.log(gen2.next())
console.log(gen2.next())
console.log(gen2.next())
console.log(gen2.next())
