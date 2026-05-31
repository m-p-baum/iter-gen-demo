# The `yield` Expression and `yield*`

- The .next() method can take an optional argument
- beomes the value of the yield where the generator picks up execution
- yield\* can be used to defer to another iterable

```js {monaco}{height: '300px'}
function* genWithVars() {
  var x = yield 1;
  var y = yield x + 2;
  var z = yield 4;
  yield z;
}

var it = genWithVars();

//yield* let's us call to an iteravle inside the generator
function* inner() {
  yield 1;
  yield 2;
  yield 3;
}

function* outer() {
  yield 0;
  yield* inner(); // delegates: yields 1, 2, 3
  yield 4;
}

[...outer()];
```
