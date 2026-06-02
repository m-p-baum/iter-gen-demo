---
class: overflow-y-auto
---
# What is an Iterator?

- The method that makes something iterable
  - It's what gets called by `for...of`, spread (`...`), destructuring (`const [a,b,c] = arr`), etc.
  - Keyed by `[Symbol.iterator]`
- An iterator object implements a `.next()` method which returns an iterator result
  - `{value: any, done?: bool}` | `{value?: any, done: true}`
- Arrays, maps, sets, strings already implement a `[Symbol.iterator]`

```js{monaco-run}{height: '300px'}

const str = "foo" 

const arr = Array.from(str)

const iterableGrades = {
  "Audrey": 95,
  "Walter": 100,
  "Rebecca": 90
  //Make this iterable
}





```
