function buildSpellingPuzzle(word, variant) {
  const chars = word.split('')
  const letterIndexes = chars.reduce((indexes, char, index) => {
    if (!/[\s-]/.test(char)) {
      indexes.push(index)
    }

    return indexes
  }, [])

  if (letterIndexes.length <= 2 || variant === 'full') {
    return chars.map((char, index) => ({
      type: !/[\s-]/.test(char) ? 'blank' : 'fixed',
      value: !/[\s-]/.test(char) ? '' : char,
      answer: char,
      index,
    }))
  }

  const revealedLetterPositions = new Set([0, letterIndexes.length - 1])

  if (variant === 'hint_1') {
    revealedLetterPositions.add(Math.max(1, Math.floor(letterIndexes.length / 3)))
  }

  if (variant === 'hint_2') {
    revealedLetterPositions.add(Math.max(1, Math.floor((letterIndexes.length * 2) / 3)))
  }

  if (revealedLetterPositions.size >= letterIndexes.length) {
    revealedLetterPositions.delete(Math.max(1, letterIndexes.length - 2))
  }

  const revealedIndexes = new Set(
    [...revealedLetterPositions].map((position) => letterIndexes[position])
  )

  return chars.map((char, index) => {
    if (/[\s-]/.test(char) || revealedIndexes.has(index)) {
      return { type: 'fixed', value: char }
    }

    return { type: 'blank', value: '', answer: char, index }
  })
}

function buildSelfCheckQuestion(word) {
  return {
    typeId: 'term_to_meaning',
    mode: 'self_check',
    instruction: '看目标语词项，回忆源语释义。',
    prompt: word.word,
    answer: word.meaning,
  }
}

function buildSpellingQuestion(word, variant) {
  return {
    typeId: `spell_${variant}`,
    mode: 'spell_input',
    instruction: '根据源语释义补全目标语词项。',
    prompt: word.meaning,
    answer: word.word,
    puzzle: buildSpellingPuzzle(word.word, variant),
    spellVariant: variant,
  }
}

export function createQuestion(word) {
  if (!word) {
    return null
  }

  const selfCheckSuccessCount = Number(word.selfCheckSuccessCount) || 0
  const hintedSpellSuccessCount = Number(word.hintedSpellSuccessCount) || 0

  if (selfCheckSuccessCount < 2) {
    return buildSelfCheckQuestion(word)
  }

  if (hintedSpellSuccessCount === 0) {
    return buildSpellingQuestion(word, 'hint_1')
  }

  if (hintedSpellSuccessCount === 1) {
    return buildSpellingQuestion(word, 'hint_2')
  }

  return buildSpellingQuestion(word, 'full')
}
