---
class: overflow-y-auto
---

# In Action

Let's implement a `Range` class in JS

<script setup>
const skeleton = `/**
 * @classdesc A simple Range class implementation
 * it should:
 * --be exposed to for...of
 * --be usable with spread operator
 * --be 'destructurable'
 */

class IterableRange {
  /**
   * @param {number} from - beginning of range (inclusive)
   * @param {number} to - end of range (inclusive)
   */
  constructor(from, to) {
    this.to = to
    this.from = from
  }

  // How do we make this class iterable?

}

const rangeAToB = new IterableRange(1, 10)


`
</script>

<AiCoder :skeleton="skeleton" height="160px" />
