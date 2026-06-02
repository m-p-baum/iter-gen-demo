function* genWithVars() {
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
console.log(it.next())
