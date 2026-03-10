import {
  getLearningLanguageLabel,
  getSpeechLanguageCode,
  getSpeechPreviewText,
} from './language.js'

function normalizeLangCode(value) {
  return (value || '').toLowerCase()
}

function getBaseLangCode(value) {
  return normalizeLangCode(value).split('-')[0]
}

function getVoiceMatchScore(voice, targetLang) {
  const voiceLang = normalizeLangCode(voice.lang)
  const target = normalizeLangCode(targetLang)
  const targetBase = getBaseLangCode(targetLang)
  const voiceName = normalizeLangCode(voice.name)

  if (voiceLang === target) {
    return 4
  }

  if (voiceLang.startsWith(`${targetBase}-`)) {
    return 3
  }

  if (getBaseLangCode(voiceLang) === targetBase) {
    return 2
  }

  if (voiceName.includes(targetBase)) {
    return 1
  }

  return 0
}

function sortVoicesByMatch(voices, targetLang) {
  return [...voices].sort((a, b) => {
    const scoreDiff = getVoiceMatchScore(b, targetLang) - getVoiceMatchScore(a, targetLang)

    if (scoreDiff !== 0) {
      return scoreDiff
    }

    if (a.default && !b.default) {
      return -1
    }

    if (!a.default && b.default) {
      return 1
    }

    return (a.name || '').localeCompare(b.name || '')
  })
}

export function getVoiceOptionsForLanguage(voices, learningLanguage) {
  const targetLang = getSpeechLanguageCode(learningLanguage)
  const matchedVoices = sortVoicesByMatch(voices, targetLang).filter(
    (voice) => getVoiceMatchScore(voice, targetLang) > 0
  )
  const fallbackVoices =
    matchedVoices.length > 0 ? matchedVoices : sortVoicesByMatch(voices, targetLang)

  return fallbackVoices.map((voice) => ({
    value: voice.voiceURI,
    label: `${voice.name} (${voice.lang || 'unknown'})${voice.default ? ' [默认]' : ''}`,
  }))
}

export function resolveSpeechVoice(voices, learningLanguage, preferredVoiceURI) {
  const targetLang = getSpeechLanguageCode(learningLanguage)
  const matchedVoices = sortVoicesByMatch(voices, targetLang).filter(
    (voice) => getVoiceMatchScore(voice, targetLang) > 0
  )
  const rankedVoices =
    matchedVoices.length > 0 ? matchedVoices : sortVoicesByMatch(voices, targetLang)
  const preferredVoice = rankedVoices.find((voice) => voice.voiceURI === preferredVoiceURI)

  return {
    voice: preferredVoice || rankedVoices[0] || null,
    languageCode: targetLang,
    usedFallback: matchedVoices.length === 0,
  }
}

export function getSpeechFallbackHint(learningLanguage, voice) {
  if (!voice) {
    return '当前浏览器没有可用语音。'
  }

  return `未找到完全匹配的 ${getLearningLanguageLabel(learningLanguage)} 语音，已回退到 ${voice.name}。`
}

export function speakPreviewText({
  learningLanguage,
  preferredVoiceURI,
  onHint,
}) {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    onHint?.('当前浏览器不支持语音播放。')
    return
  }

  const voices = window.speechSynthesis.getVoices()
  const { voice, languageCode, usedFallback } = resolveSpeechVoice(
    voices,
    learningLanguage,
    preferredVoiceURI
  )

  if (!voice) {
    onHint?.('当前浏览器没有可用语音。')
    return
  }

  const utterance = new SpeechSynthesisUtterance(getSpeechPreviewText(learningLanguage))

  utterance.voice = voice
  utterance.lang = voice.lang || languageCode
  utterance.rate = 0.95
  utterance.pitch = 1
  utterance.onstart = () => {
    onHint?.(usedFallback ? getSpeechFallbackHint(learningLanguage, voice) : '')
  }
  utterance.onerror = () => {
    onHint?.('语音播放失败，请稍后重试。')
  }

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}
