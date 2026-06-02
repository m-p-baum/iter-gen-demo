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
  const iterator = iterable[Symbol.iterator]();

  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      // use predicate to filter
    },
  };
}

// --- As Generator ---

function* lazyFilter(iter, predicate) {
  for (const val of iter) {
    if (predicate(val)) yield val;
  }
}

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const lazyEvens = lazyFilter(arr, (n) => n % 2 === 0);
lazyEvens.next();
