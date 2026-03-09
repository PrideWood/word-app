function buildWordItem(word, meaning, indexSeed) {
  return {
    id: Date.now() + indexSeed,
    word,
    meaning,
    status: 'new',
    correctCount: 0,
    wrongCount: 0,
    correctStreak: 0,
    spellingProgress: 0,
    fullSpellSuccessCount: 0,
  }
}

export function parseWordsText(text) {
  const words = []
  const seenWords = new Set()
  const lines = text.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const parts = line.split(/\s+/)

    if (parts.length < 2) {
      continue
    }

    const word = parts[0].trim()
    const meaning = parts.slice(1).join(' ')
    const wordKey = word.toLowerCase()

    if (!word || !meaning || seenWords.has(wordKey)) {
      continue
    }

    seenWords.add(wordKey)
    words.push(buildWordItem(word, meaning, index))
  }

  return words
}

function isHeaderLine(columns) {
  if (columns.length < 2) {
    return false
  }

  const first = columns[0].trim().toLowerCase()
  const second = columns[1].trim().toLowerCase()

  return first === 'word' && second === 'meaning'
}

export function parseWordsCsv(csvText) {
  const words = []
  const seenWords = new Set()
  const lines = csvText.split('\n')
  let startIndex = 0

  while (startIndex < lines.length && !lines[startIndex].trim()) {
    startIndex += 1
  }

  if (startIndex < lines.length) {
    const firstColumns = lines[startIndex].split(',')
    if (isHeaderLine(firstColumns)) {
      startIndex += 1
    }
  }

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const columns = line.split(',')
    if (columns.length < 2) {
      continue
    }

    const word = columns[0].trim()
    const meaning = columns.slice(1).join(',').trim()
    const wordKey = word.toLowerCase()

    if (!word || !meaning || seenWords.has(wordKey)) {
      continue
    }

    seenWords.add(wordKey)
    words.push(buildWordItem(word, meaning, index))
  }

  return words
}
