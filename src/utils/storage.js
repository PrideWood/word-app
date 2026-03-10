import {
  DEFAULT_LEARNING_LANGUAGE,
  isSupportedLearningLanguage,
} from './language.js'

const STORAGE_KEY = 'my-word-app-data'

function normalizeWordProgress(item) {
  const selfCheckSuccessCount = Number(item.selfCheckSuccessCount) || 0
  const hintedSpellSuccessCount = Number(item.hintedSpellSuccessCount) || 0
  const fullSpellSuccessCount = Number(item.fullSpellSuccessCount) || 0
  const isMastered =
    selfCheckSuccessCount >= 2 &&
    hintedSpellSuccessCount >= 2 &&
    fullSpellSuccessCount >= 2
  const hasLearningProgress =
    selfCheckSuccessCount > 0 ||
    hintedSpellSuccessCount > 0 ||
    fullSpellSuccessCount > 0 ||
    (Number(item.correctCount) || 0) > 0 ||
    (Number(item.wrongCount) || 0) > 0

  return {
    ...item,
    spellingProgress: hintedSpellSuccessCount >= 2 ? 3 : hintedSpellSuccessCount,
    selfCheckSuccessCount,
    hintedSpellSuccessCount,
    fullSpellSuccessCount,
    status: isMastered ? 'mastered' : hasLearningProgress ? 'learning' : 'new',
  }
}

function getDefaultData() {
  return {
    words: [],
    statsByDate: {},
    lastVisitedPage: '/',
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    speechVoiceSelections: {},
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
  return Array.isArray(current.words) ? current.words.map(normalizeWordProgress) : []
}

export function saveWords(words) {
  const current = readData()

  writeData({
    ...current,
    words: Array.isArray(words) ? words.map(normalizeWordProgress) : [],
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
      return normalizeWordProgress(item)
    }

    const currentSelfCheckSuccessCount = Number(item.selfCheckSuccessCount) || 0
    const currentHintedSpellSuccessCount = Number(item.hintedSpellSuccessCount) || 0
    const currentFullSpellSuccessCount = Number(item.fullSpellSuccessCount) || 0
    let nextSelfCheckSuccessCount = currentSelfCheckSuccessCount
    let nextHintedSpellSuccessCount = currentHintedSpellSuccessCount
    let nextFullSpellSuccessCount = currentFullSpellSuccessCount

    if (isCorrect && questionMode === 'self_check') {
      nextSelfCheckSuccessCount = Math.min(2, currentSelfCheckSuccessCount + 1)
    }

    if (isCorrect && questionMode === 'spell_input' && allowSpellProgress) {
      if (spellVariant === 'hint_1' || spellVariant === 'hint_2') {
        nextHintedSpellSuccessCount = Math.min(2, currentHintedSpellSuccessCount + 1)
      } else if (spellVariant === 'full') {
        nextFullSpellSuccessCount = Math.min(2, currentFullSpellSuccessCount + 1)
      }
    }

    const nextStreak = isCorrect ? (item.correctStreak || 0) + 1 : 0
    return normalizeWordProgress({
      ...item,
      correctCount: (item.correctCount || 0) + (isCorrect ? 1 : 0),
      wrongCount: (item.wrongCount || 0) + (isCorrect ? 0 : 1),
      correctStreak: nextStreak,
      spellingProgress: nextHintedSpellSuccessCount >= 2 ? 3 : nextHintedSpellSuccessCount,
      selfCheckSuccessCount: nextSelfCheckSuccessCount,
      hintedSpellSuccessCount: nextHintedSpellSuccessCount,
      fullSpellSuccessCount: nextFullSpellSuccessCount,
    })
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
    return
  }

  const current = readData()
  const normalizedWords = Array.isArray(current.words)
    ? current.words.map(normalizeWordProgress)
    : []

  if (!isSupportedLearningLanguage(current.learningLanguage)) {
    writeData({
      ...current,
      words: normalizedWords,
      learningLanguage: DEFAULT_LEARNING_LANGUAGE,
      speechVoiceSelections:
        current.speechVoiceSelections && typeof current.speechVoiceSelections === 'object'
          ? current.speechVoiceSelections
          : {},
      updatedAt: new Date().toISOString(),
    })
    return
  }

  if (!current.speechVoiceSelections || typeof current.speechVoiceSelections !== 'object') {
    writeData({
      ...current,
      words: normalizedWords,
      speechVoiceSelections: {},
      updatedAt: new Date().toISOString(),
    })
    return
  }

  if (JSON.stringify(normalizedWords) !== JSON.stringify(current.words || [])) {
    writeData({
      ...current,
      words: normalizedWords,
      updatedAt: new Date().toISOString(),
    })
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

export function getLearningLanguage() {
  const current = readData()

  if (isSupportedLearningLanguage(current.learningLanguage)) {
    return current.learningLanguage
  }

  return DEFAULT_LEARNING_LANGUAGE
}

export function saveLearningLanguage(language) {
  const nextLanguage = isSupportedLearningLanguage(language)
    ? language
    : DEFAULT_LEARNING_LANGUAGE
  const current = readData()

  writeData({
    ...current,
    learningLanguage: nextLanguage,
    updatedAt: new Date().toISOString(),
  })
}

export function getSpeechVoiceSelection(language) {
  const current = readData()
  const selections =
    current.speechVoiceSelections && typeof current.speechVoiceSelections === 'object'
      ? current.speechVoiceSelections
      : {}

  return typeof selections[language] === 'string' ? selections[language] : ''
}

export function saveSpeechVoiceSelection(language, voiceURI) {
  if (!isSupportedLearningLanguage(language)) {
    return
  }

  const current = readData()
  const selections =
    current.speechVoiceSelections && typeof current.speechVoiceSelections === 'object'
      ? current.speechVoiceSelections
      : {}

  writeData({
    ...current,
    speechVoiceSelections: {
      ...selections,
      [language]: voiceURI || '',
    },
    updatedAt: new Date().toISOString(),
  })
}
