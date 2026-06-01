---
class: overflow-y-auto
---

# Streamlining the Pattern with Generators

- A generator is a special iterator created w/ a simple syntax (`*`)
  - Generators are iterators and state-machines bundled up
- Function execution blocks can be divided using the `yield` keyword
  - separates function execution from caller execution
- First `.next()` runs code until first `yeild`
  - subesquent calls likewise run code until the next `yield`
  - iterator is exhausted at `return` or simply when there is no longer a yield

<script setup>
const skel= `function* generator() {
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
`
</script>

<CodeDebugger :skeleton="skel" />

---
class: overflow-y-auto
---
# Generators — Structure

- Executing a generator function returns a **generator object**
- Like any iterator, `.next()` returns `{value, done}`
  - The `value` is defined by the yield expression
  - `done` is true if we reach end/return.
    - `value` will be the function return value (if any) when `done===true`

<script setup>
const genSkeleton = `function* smallNumbers() {
  let y1 = yield 1

  let y2 = yield 2

  let y3 = yield 3

  return 4
}

const gen = smallNumbers()
console.log(gen.next())
console.log(gen.next())
console.log(gen.next())
console.log(gen.next())`
</script>

<CodeDebugger :skeleton="genSkeleton" />
