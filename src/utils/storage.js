const STORAGE_KEY = 'my-word-app-data'

function getDefaultData() {
  return {
    words: [],
    statsByDate: {},
    lastVisitedPage: '/',
    updatedAt: new Date().toISOString(),
  }
}

function readData() {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return getDefaultData()
  }

  try {
    return JSON.parse(raw)
  } catch {
    return getDefaultData()
  }
}

function writeData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetLearningData() {
  const current = readData()

  writeData({
    ...current,
    words: [],
    statsByDate: {},
    updatedAt: new Date().toISOString(),
  })
}

export function getWords() {
  const current = readData()
  return Array.isArray(current.words) ? current.words : []
}

export function saveWords(words) {
  const current = readData()

  writeData({
    ...current,
    words,
    updatedAt: new Date().toISOString(),
  })
}

export function updateWordResult(wordId, isCorrect, options = {}) {
  const current = readData()
  const sourceWords = Array.isArray(current.words) ? current.words : []
  const questionMode = options.questionMode || 'self_check'
  const spellVariant = options.spellVariant || null
  const allowSpellProgress = options.allowSpellProgress !== false

  const nextWords = sourceWords.map((item) => {
    if (item.id !== wordId) {
      return item
    }

    const currentProgress = Number(item.spellingProgress) || 0
    const currentFullSpellSuccessCount = Number(item.fullSpellSuccessCount) || 0
    let nextProgress = currentProgress
    let nextFullSpellSuccessCount = currentFullSpellSuccessCount

    if (isCorrect && questionMode === 'self_check' && currentProgress === 0) {
      nextProgress = 1
    }

    if (isCorrect && questionMode === 'spell_input' && allowSpellProgress) {
      if (spellVariant === 'hint_1') {
        nextProgress = 2
      } else if (spellVariant === 'hint_2') {
        nextProgress = 3
      } else if (spellVariant === 'full') {
        nextProgress = 3
        nextFullSpellSuccessCount = currentFullSpellSuccessCount + 1
      }
    }

    const nextStreak = isCorrect ? (item.correctStreak || 0) + 1 : 0
    const isMastered = nextFullSpellSuccessCount >= 2
    const nextStatus = isMastered ? 'mastered' : 'learning'

    return {
      ...item,
      correctCount: (item.correctCount || 0) + (isCorrect ? 1 : 0),
      wrongCount: (item.wrongCount || 0) + (isCorrect ? 0 : 1),
      correctStreak: nextStreak,
      spellingProgress: nextProgress,
      fullSpellSuccessCount: nextFullSpellSuccessCount,
      status: nextStatus,
    }
  })

  writeData({
    ...current,
    words: nextWords,
    updatedAt: new Date().toISOString(),
  })

  return nextWords
}

export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    writeData(getDefaultData())
  }
}

export function saveLastVisitedPage(pathname) {
  const current = readData()

  writeData({
    ...current,
    lastVisitedPage: pathname,
    updatedAt: new Date().toISOString(),
  })
}
