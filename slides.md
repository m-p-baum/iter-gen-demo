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

Control Flow, Async -> 'Sync', Lazy Evaluation

---
transition: fade-out
---

# What's 'Wrong' with this code

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

//what would be better? 

```
---

# What is Actually Happening?
```js{monaco}
const map = new Map([['a',1], ['b',2], ['c',3]])

for (const [k,v] of map) {
  console.log(k,v)
}


```

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

```js{monaco}{height: '400px'}
/**
 * @classdesc A simple Range class implementation

 * it should:
 * --be exposed to for...of
 * --be usable with spread operator
 * --be 'destructurable'
 */


class IterableRange {
  /**
   * Inits new range
   * @param {number} from - the beginning of the range (inclusive)
   * @param {number} to - the end of the range (inclusive)
  */
    constructor(from, to) {
        this.to = to
        this.from = from
    }

    //How do we make this class iterable?

}

const rangeAToB = new IterableRange(1,10)

//And now we can use for...of

//or destructure

//or spread

```
---
---
# Interacting with the Iterator Directly
```js{monaco}
/**
 * An iterable that returns natural numbers in inf sequence
 */
const infiniteSequence = {
    [Symbol.iterator]() {
        let next = 0
        return {
            next() {
                next++
                return {value: next, done: false}
            }
        }
    }
}

//What will this do?
const sequece = [...infiniteSequence]

//but that doesn't make the code totally useless...

```
---

# Controlling the Iterator to Enhance Usefulness

- Calling an iterable's `[Symbol.iterator]` method creates a fresh instance each time
- `for…of` and spread completely exhaust the iterator they create
- Destructuring pulls lazily:

```js {monaco}{height: '400px'}
const arr = [1, 2, 3, 4]
const [a, b] = arr
const [c, d] = arr

//What if we make the iterator an iterable?
function range(from, to) {
    return {
        to,
        from,
        //Let's make the iterator iterable
        [Symbol.iterator](){
            var next = from
            var last = to
            return {
                next() {
                    var value = next
                    next++
                    return value <= last ? {value: value} : {done:true}
                }
            }
        }
    }
}

```


---

# Advantages of Including an Iterator

- **Lazy evaluation** — compute values only when needed
- **Legibility** — cleaner call sites with `for…of` and spread
- **Flow control** — pause, resume, and cancel traversal
   - Pagination, streams, transforms
- Before diving in, a simpler syntax

```js {monaco}{height:'400px'}
class NumRange {
    constructor(from, to) {
        this.from = from
        this.to = to
    }

    [Symbol.iterator]() {
        let next = this.from
        let last = this.to
       return {
        next() {
            let value = next
            next++
            return value <= last ? {value: value} : { done:true }
        }
       }
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
    }
}

}


```


---
---
 # Useful or annoying?
 - What about a simpler syntax
---
---



# Generators

Generator = iterator + state machine

- Uses the `yield` keyword to start/stop execution on calls to the iterator created by invoking the generator

```js {monaco}

function* simpleGenerator() {
    var n = 0
    yield n
    n++
    yield n
    n++ 
    yield n
}

const gen = simpleGenerator()

```

---

# Generators — Structure and Use

- Executing a generator function returns a **generator object**
- The generator is an iterator — has `.next()` which returns `{value, done}`
- Each call to `.next()` runs the function body until the next `yield` and returns its value
- Generators are a great **flow control** method
  - The generator and the caller are two separate execution streams

```js {monaco}{height: '200px'}
function* smallNumbers() {
    let y1 = yield 1
    console.log(y1)
    let y2 = yield 2
    console.log(y2)
    let y3 = yield 3
    console.log(y3)
    return 4 // the value when done === true
}

//let's revist the filter, now as a generator

function* lazyFilter(iter, predicate) {
  //since iter is iterable, let's iterate over  it
  for (const val of iter ) {
    if (predicate(val)) yield val
  }
}

const arr = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
const lazyEvens = lazyFilter(arr, (n)=> n%2===0)
lazyEvens.next()



```


---

# The `yield` Expression and `yield*`
- The .next() method can take an optional argument
 - beomes the value of the yield where the generator picks up execution
- yield* can be used to defer to another iterable

```js {monaco}{height: '400px'}
function* genWithVars() {
    var x = yield 1
    var y = yield x + 2
    var z = yield 4
    yield z
}

var it = genWithVars()


//yield* let's us call to an iteravle inside the generator
function* inner() {
  yield 1;
  yield 2;
  yield 3;
}

function* outer() {
  yield 0;
  yield* inner();   // delegates: yields 1, 2, 3
  yield 4;
}

[...outer()]; 
```

---

# Back To Promise Chains
- Before `async/await`, generators becaome a powerful tool for writing cleaner code
- But this required some architecture 

```js {monaco}{height: '400px'}
const HEADERS = { 'User-Agent': 'weather-demo (you@example.com)' };
const fetchJSON = (url) => fetch(url, { headers: HEADERS }).then(r => r.json())

fetchJSON('https://api.weather.gov/points/40.99,-73.78')
  .then(points =>
    fetchJSON(points.properties.forecast) //points contains the URL we need for forecast
      .then(forecast =>
        fetchJSON(points.properties.observationStations) //and also
          .then(stationsData => {
            const station = stationsData.features[0];
            return fetchJSON(`${station.id}/observations/latest`)
              .then(obs => ({
                city:        points.properties.relativeLocation.properties.city, //points still referenced, need it in scope
                tonight:     forecast.properties.periods[0].detailedForecast, //same w/ forecast
                stationName: station.properties.name, //needs station data, but did not need to nest to stay in scope
                tempC:       obs.properties.temperature.value,
              }));
          })
      )
  )
  .then(report => console.log(report))
  .catch(console.error);

//or we can flatten this out a bit with a generator

/**
 * simple flattening to give scope in a seemingly sync way
 */
function* weatherReport(lat, lon) {
  const points       = yield fetchJSON(`https://api.weather.gov/points/${lat},${lon}`);
  const forecast     = yield fetchJSON(points.properties.forecast);
  const stationsData = yield fetchJSON(points.properties.observationStations);
  const station      = stationsData.features[0];
  const obs          = yield fetchJSON(`${station.id}/observations/latest`);

  return({
    city:        points.properties.relativeLocation.properties.city,
    tonight:     forecast.properties.periods[0].detailedForecast,
    stationName: station.properties.name,
    tempC:       obs.properties.temperature.value,
  });
}
/**
 * This looks nice, but actually isn't much help by itself. 
 * Why not?
 * what do we still need to do?
*/


//Or instead...
```

---
---
# Conclusion
- Iterators and generators combine lazy eval w/ flow control
- Influential for modern handling of async code in JS
 - While async/await obviates much need for network, can still be helpful for streams, lazy transformations