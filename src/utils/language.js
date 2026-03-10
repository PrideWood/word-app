export const LANGUAGE_OPTIONS = [
  {
    value: 'en',
    label: 'English（EN）',
    speechLang: 'en-US',
    speechPreview: 'hello',
  },
  {
    value: 'fr',
    label: 'French（FR）',
    speechLang: 'fr-FR',
    speechPreview: 'bonjour',
  },
  {
    value: 'ja',
    label: 'Japanese（日）',
    speechLang: 'ja-JP',
    speechPreview: 'こんにちは',
  },
  {
    value: 'zh',
    label: 'Chinese（中）',
    speechLang: 'zh-CN',
    speechPreview: '你好',
  },
]

export const DEFAULT_LEARNING_LANGUAGE = LANGUAGE_OPTIONS[0].value

export function isSupportedLearningLanguage(value) {
  return LANGUAGE_OPTIONS.some((option) => option.value === value)
}

export function getLearningLanguageLabel(value) {
  return (
    LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ||
    getLearningLanguageLabel(DEFAULT_LEARNING_LANGUAGE)
  )
}

export function getSpeechLanguageCode(value) {
  return (
    LANGUAGE_OPTIONS.find((option) => option.value === value)?.speechLang ||
    getSpeechLanguageCode(DEFAULT_LEARNING_LANGUAGE)
  )
}

export function getSpeechPreviewText(value) {
  return (
    LANGUAGE_OPTIONS.find((option) => option.value === value)?.speechPreview ||
    getSpeechPreviewText(DEFAULT_LEARNING_LANGUAGE)
  )
}

export function usesWholeTermInput(value) {
  return value === 'zh' || value === 'ja'
}
