# Useful or annoying?

- What about a simpler syntax

---



# Generators — Structure and Use

- Executing a generator function returns a **generator object**
- The generator is an iterator — has `.next()` which returns `{value, done}`
- Each call to `.next()` runs the function body until the next `yield` keyword and returns its value
- Generators are a great **flow control** method
  - The generator and the caller are two separate execution streams

```js {monaco-run}{height: '200px'}
function* partialSums() {
  let n = 0
  const nthTerm = (int) => .5**n
  
}
const sums = partialSums()

```

