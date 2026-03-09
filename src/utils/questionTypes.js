function buildSpellingPuzzle(word, variant) {
  const chars = word.split('')

  if (chars.length <= 2 || variant === 'full') {
    return chars.map((char, index) => ({
      type: 'blank',
      value: '',
      answer: char,
      index,
    }))
  }

  const revealed = new Set([0, chars.length - 1])

  if (variant === 'hint_1') {
    revealed.add(Math.max(1, Math.floor(chars.length / 3)))
  }

  if (variant === 'hint_2') {
    revealed.add(Math.max(1, Math.floor((chars.length * 2) / 3)))
  }

  if (revealed.size >= chars.length) {
    revealed.delete(Math.max(1, chars.length - 2))
  }

  return chars.map((char, index) => {
    if (revealed.has(index)) {
      return { type: 'fixed', value: char }
    }

    return { type: 'blank', value: '', answer: char, index }
  })
}

function buildSelfCheckQuestion(word) {
  return {
    typeId: 'en_to_zh',
    mode: 'self_check',
    instruction: '看英文，回忆中文。',
    prompt: word.word,
    answer: word.meaning,
  }
}

function buildSpellingQuestion(word, variant) {
  return {
    typeId: `spell_${variant}`,
    mode: 'spell_input',
    instruction: '拼写练习。',
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

  const progress = Number(word.spellingProgress) || 0

  if (progress <= 0) {
    return buildSelfCheckQuestion(word)
  }

  if (progress === 1) {
    return buildSpellingQuestion(word, 'hint_1')
  }

  if (progress === 2) {
    return buildSpellingQuestion(word, 'hint_2')
  }

  return buildSpellingQuestion(word, 'full')
}
