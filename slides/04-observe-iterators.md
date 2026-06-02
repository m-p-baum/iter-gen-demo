---
class: overflow-y-auto
---

# Observe the ~~Plans~~ Iterators Within ~~Plans~~ Iterators

- One of the big advantages of **iterators** is that they are lazy
- A disadvantage (so far) is that we are manually iterating
- We can really control a process w/ a little bit of tweaking

<script setup>
const deckSkeleton = `

class Deck {
  constructor() {
    const cards = [];
    this.cards = shuffle(cards);
    this.cursor = 0;
  }

  next() {
    if (this.cursor >= this.cards.length)
      return { value: undefined, done: true };
    return { value: this.cards[this.cursor++], done: false };
  }
}

const deck = new Deck()

// Deal hand 1
const hand1 = []
for (let n = 1; n <= 5; n++) {
  hand1.push(deck.next().value)
}
console.log('Hand 1:', hand1)

// Deal hand 2

const hand2 = []
for (let n = 1; n <= 5; n++) {
  hand2.push(deck.next().value)
}
console.log('Hand 2:', hand2)

// Deal remaining cards to table


function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

`
</script>

<AiCoder :skeleton="deckSkeleton" height="240px" />
