export type MemoryQuote = {
  text: string;
  author?: string;
};

// Curated set of short, evocative travel/memory quotes.
const BASE_QUOTES: MemoryQuote[] = [
  { text: "We take photos as a return ticket to a moment otherwise gone.", author: "Unknown" },
  { text: "Wherever you go becomes a part of you somehow.", author: "Anita Desai" },
  { text: "Collect moments, not things.", author: "Unknown" },
  { text: "The world is a book and those who do not travel read only one page.", author: "Augustine" },
  { text: "One’s destination is never a place, but a new way of seeing things.", author: "Henry Miller" },
  { text: "Live for the moments you can’t put into words.", author: "Unknown" },
  { text: "Memories are the diary we all carry about with us.", author: "Oscar Wilde" },
  { text: "Take only memories, leave only footprints.", author: "Chief Seattle" },
  { text: "A good snapshot keeps a moment from running away.", author: "Eudora Welty" },
  { text: "Wherever you go, go with all your heart.", author: "Confucius" },
  { text: "Happiness is only real when shared.", author: "Christopher McCandless" },
  { text: "Every picture tells a story.", author: "Unknown" },
  { text: "To travel is to take a journey into yourself.", author: "Danny Kaye" },
  { text: "Travel far enough, you meet yourself.", author: "David Mitchell" },
  { text: "Sometimes you will never know the value of a moment until it becomes a memory.", author: "Dr. Seuss" },
  { text: "The best journeys answer questions that in the beginning you didn't even think to ask.", author: "Jeff Johnson" },
  { text: "The gladdest moment in human life is a departure into unknown lands.", author: "Richard Burton" },
  { text: "Wherever you go, there you are.", author: "Confucius" },
  { text: "There’s a sunrise and a sunset every day. You can choose to be there for it.", author: "Cheryl Strayed" },
  { text: "Life is either a daring adventure or nothing at all.", author: "Helen Keller" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "Leave the road, take the trails.", author: "Pythagoras" },
  { text: "The journey itself is my home.", author: "Matsuo Bashō" },
  { text: "We travel not to escape life, but for life not to escape us.", author: "Unknown" },
  { text: "If you want to go fast, go alone. If you want to go far, go together.", author: "African Proverb" },
  { text: "Where the road ends, the story begins.", author: "Unknown" },
  { text: "When you leave a place, you take it with you. When you return, you bring back a different self.", author: "Unknown" },
  { text: "Wherever there is light, there is a shadow; and the world of photography is written in both.", author: "Unknown" },
  { text: "You are the stories you tell yourself on the way home.", author: "Unknown" },
  { text: "I am not the same, having seen the moon shine on the other side of the world.", author: "Mary Anne Radmacher" },
  { text: "A photograph is the pause button of life.", author: "Unknown" },
  { text: "In every walk with nature, one receives far more than he seeks.", author: "John Muir" },
  { text: "To awaken alone in a strange town is one of the pleasantest sensations in the world.", author: "Freya Stark" },
  { text: "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.", author: "Marcel Proust" },
  { text: "There is a kind of magicness about going far away and then coming back all changed.", author: "Kate Douglas Wiggin" },
  { text: "We are homesick most for the places we have never known.", author: "Carson McCullers" },
  { text: "At the end of the day, your feet should be dirty, your hair messy and your eyes sparkling.", author: "Shanti" },
  { text: "Time flies over us, but leaves its shadow behind.", author: "Nathaniel Hawthorne" },
  { text: "Let’s find some beautiful place to get lost.", author: "Unknown" },
  { text: "Some roads aren’t meant to be traveled alone.", author: "Chinese Proverb" },
  { text: "If we were meant to stay in one place, we’d have roots instead of feet.", author: "Rachel Wolchin" },
  { text: "I take photos to understand what my life means to me.", author: "Unknown" },
  { text: "Hold on to your memories; they will hold on to you.", author: "Unknown" },
  { text: "The horizon will not disappear as long as you keep walking.", author: "Unknown" },
  { text: "Every mile a memory.", author: "Unknown" },
  { text: "One day you will tell the story of how you overcame what you went through and it will be someone else’s survival guide.", author: "Brené Brown" },
];

// Lightly personalize a quote with location/date if available.
export function personalizeQuote(base: MemoryQuote, opts: { location?: string; when?: string }): MemoryQuote {
  const { location, when } = opts;
  let text = base.text;
  const hint = [location, when].filter(Boolean).join(" · ");
  if (hint) text += ` — ${hint}`;
  return { ...base, text };
}

export function pickQuote(seed: string, extras?: { location?: string; when?: string }): MemoryQuote {
  const idx = Math.abs(hash(seed)) % BASE_QUOTES.length;
  return personalizeQuote(BASE_QUOTES[idx], extras ?? {});
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h | 0;
}
