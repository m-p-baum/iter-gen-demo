# Useful or annoying?

- What about a simpler syntax

---



# Generators — Structure and Use

- Executing a generator function returns a **generator object**
- The generator is an iterator — has `.next()` which returns `{value, done}`
- Each call to `.next()` runs the function body until the next `yield` keyword and returns its value
- Generators are a great **flow control** method
  - The generator and the caller are two separate execution streams

<script setup>
const genSkeleton = `function* smallNumbers() {
  let y1 = yield 1
  console.log('sent back:', y1)
  let y2 = yield 2
  console.log('sent back:', y2)
  let y3 = yield 3
  console.log('sent back:', y3)
  return 4
}

const gen = smallNumbers()
console.log(gen.next())
console.log(gen.next())
console.log(gen.next())
console.log(gen.next())`
</script>

<CodeDebugger :skeleton="genSkeleton" height="160px" />

