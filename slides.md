---
theme: seriph
title: Iterators & Generators in JS
info: |
  ## Iterators & Generators in JS
  Control Flow, Async, Lazy Evaluation
class: text-center
drawings:
  persist: false
transition: slide-left
comark: true
duration: 35min
---

# Iterators & Generators in JS

Control Flow, Async, Lazy Evaluation

---
transition: fade-out
---

# What's 'wrong' with this code

```js {monaco}
getUser(id).then(user => {
  return getOrders(user).then(orders => {
    return getItems(orders).then(items => {
      return ship(items).then(result => {
        console.log(result);
      });
    });
  });
}).catch(handle);
```

---
layout: center
class: text-center
---

# Mental warm-up: Fibonacci

---

# What is an Iterator?

- An iterator object implements a `.next()` method which returns an iterator result
  - `{value: any, done?: bool}` | `{value?: any, done: true}`
- An **iterable** implements a `[Symbol.iterator]` method which returns an iterator
- Built-in iterables: arrays, sets, strings, maps
- Iterators may be (and in the case of built-ins often are) themselves iterable
- `for…of`, spread (`...`), destructuring all require iterables
  - Caveat: object spread and object destructuring are separate

---

# Basic Example

Let's implement a `Range` class in JS

---
layout: two-cols
---

# Controlling the Iterator to Enhance Usefulness

- Calling an iterable's `[Symbol.iterator]` method creates a fresh instance each time
- `for…of` and spread completely exhaust the iterator they create
- Destructuring pulls lazily:

```js {monaco}
const arr = [1, 2, 3, 4]
const [a, b] = arr
const [c, d] = arr
```

::right::

<div class="pl-4 pt-8">

- We can directly interact with the iterator
- Iterators can themselves be iterable
- Defining functions that take and return iterables

</div>

---

# Advantages of Including an Iterator

- **Lazy evaluation** — compute values only when needed
- **Legibility** — cleaner call sites with `for…of` and spread
- **Flow control** — pause, resume, and cancel traversal
- It can be particularly useful to define functions that take **and** return iterables

---
layout: center
class: text-center
---

# But Why?

Other than the specific examples given, why is this inherently useful?

<br/>

*Totally valid — but first, a simpler syntax.*

---

# Generators

Generator = iterator + state machine

- Uses the `yield` keyword to start/stop execution on calls to the iterator created by invoking the generator

```js {monaco}
function* myGenerator() {
  yield 1
  yield 2
  yield 3
}

const gen = myGenerator()
gen.next() // { value: 1, done: false }
gen.next() // { value: 2, done: false }
gen.next() // { value: 3, done: false }
gen.next() // { value: undefined, done: true }
```

---

# Generators — Structure and Use

- Executing a generator function returns a **generator object**
- The generator is an iterator — has `.next()` which returns `{value, done}`
- Each call to `.next()` runs the function body until the next `yield` and returns its value
- Generators are a great **flow control** method
  - In the story of web development, became a common solution for promise management
- We can take advantage of passing an argument to `.next()`
- `yield` itself can delegate to another iterable (`yield*`)
