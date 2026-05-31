# What is an Iterator?

- The method that makes something iterable
  - It's what gets called by `for...of`, spread (`...`), destructuring (`const [a,b,c] = arr`), etc.
  - Keyed by `[Symbol.iterator]`
- An iterator object implements a `.next()` method which returns an iterator result
  - `{value: any, done?: bool}` | `{value?: any, done: true}`
- Arrays, maps, sets, strings already implement a `[Symbol.iterator]`

```js{monaco-run}{height: '100px'}

//const arr = Array.from()

```
