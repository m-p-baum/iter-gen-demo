# Operating on an Iterator

```js {monaco}{height:'200px'}
class NumRange {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  [Symbol.iterator]() {
    let next = this.from;
    let last = this.to;
    return {
      next() {
        let value = next;
        next++;
        return value <= last ? { value: value } : { done: true };
      },
    };
  }
}

/**
 * A function to create a filtered iterable
 * @param {Iterable} - an iterable object
 * @param {Function} - a predicate function for filtering
 */

function filter(iterable, predicate) {
  //invoke the iterable's iterator
  const iterator = iterable[Symbol.iterator]();

  return {
    //make this iterator iterable
    [Symbol.iterator]() {
      return this;
    },
    next() {
      //use predicate to filter
    },
  };
}
```
---
# As Generator
```js{monaco-run}{height:'300px'}
//let's revist the filter, now as a generator

function* lazyFilter(iter, predicate) {
  //since iter is iterable, let's iterate over  it
  for (const val of iter) {
    if (predicate(val)) yield val;
  }
}

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const lazyEvens = lazyFilter(arr, (n) => n % 2 === 0);
lazyEvens.next();
```

```