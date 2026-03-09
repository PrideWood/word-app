function getPriorityWeight(word) {
  const status = word.status || 'new'

  if (status === 'new') {
    return 6
  }

  if (status === 'learning') {
    return 5
  }

  return 1
}

export function getNextWord(words, currentWordId = null) {
  if (!Array.isArray(words) || words.length === 0) {
    return null
  }

  const activeWords = words.filter(
    (item) => item.status === 'new' || item.status === 'learning',
  )
  if (activeWords.length === 0) {
    return null
  }

  const candidates = activeWords

  const weighted = candidates.map((item) => {
    const wrongCount = Number(item.wrongCount) || 0
    const baseWeight = getPriorityWeight(item) + wrongCount * 2

    if (candidates.length > 1 && item.id === currentWordId) {
      return {
        item,
        weight: Math.max(1, baseWeight - 2),
      }
    }

    return {
      item,
      weight: Math.max(1, baseWeight),
    }
  })

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let randomPoint = Math.random() * totalWeight

  for (const entry of weighted) {
    randomPoint -= entry.weight

    if (randomPoint <= 0) {
      return entry.item
    }
  }

  return weighted[weighted.length - 1].item
}
