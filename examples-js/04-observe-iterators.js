
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

const deck = new Deck();

// Deal hand 1
const hand1 = [];
for (const card of deck) {
  hand1.push(card);
  if (hand1.length === 5) break;
}
console.log("Hand 1:", hand1);

// Deal hand 2 — should continue from card 6, not restart


function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}