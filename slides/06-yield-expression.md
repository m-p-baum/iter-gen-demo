---
class: overflow-y-auto
---
# The `yield` Expression

- The `.next()` method can take an optional argument
- Whatever is passed to `next` becomes the value of the yield where the generator picks up execution
- yield\* can be used to defer to another iterable

<script setup>
const yieldSkel = `function* genWithVars() {
  var x = yield 1
  var y = yield x + 2
  var z = yield 4
  yield z
}

var it = genWithVars()
console.log(it.next())
console.log(it.next(10))
console.log(it.next(20))
console.log(it.next(30))
console.log(it.next())`
</script>

<CodeDebugger :skeleton="yieldSkel" />
