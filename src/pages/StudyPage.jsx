import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { getSpeechLanguageCode, usesWholeTermInput } from '../utils/language.js'
import { createQuestion } from '../utils/questionTypes.js'
import { getNextWord } from '../utils/scheduler.js'
import { getSpeechFallbackHint, resolveSpeechVoice } from '../utils/speech.js'
import {
  getLearningLanguage,
  getSpeechVoiceSelection,
  getWords,
  updateWordResult,
} from '../utils/storage.js'
import { recordAnswer, recordStudyDuration } from '../utils/stats.js'

function StudyPage() {
  const [words, setWords] = useState([])
  const [currentWordId, setCurrentWordId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [waitingNextAfterWrong, setWaitingNextAfterWrong] = useState(false)
  const [spellInputs, setSpellInputs] = useState({})
  const [spellDrafts, setSpellDrafts] = useState({})
  const [wholeSpellInput, setWholeSpellInput] = useState('')
  const [wholeSpellDraft, setWholeSpellDraft] = useState('')
  const [spellResult, setSpellResult] = useState(null)
  const [spellRoundHasError, setSpellRoundHasError] = useState(false)
  const [speechHint, setSpeechHint] = useState('')
  const enterTimeRef = useRef(0)
  const savedDurationRef = useRef(false)
  const autoSpokenQuestionStageRef = useRef(new Set())
  const autoSpeakTimerRef = useRef(null)
  const spellInputRefs = useRef({})
  const skipNextChangeRef = useRef({})
  const wholeSpellInputRef = useRef(null)
  const learningLanguage = getLearningLanguage()
  const useWholeTermSpellInput = usesWholeTermInput(learningLanguage)
  const questionFocusKey = `${currentWordId || 'none'}-${currentQuestion?.typeId || 'none'}`

  const getQuestionAudioStageKey = () => {
    if (!currentWord || !currentQuestion) {
      return ''
    }

    if (currentQuestion.mode === 'self_check') {
      return `${currentWord.id}:self_check`
    }

    if (currentQuestion.mode === 'spell_input' && currentQuestion.spellVariant === 'full') {
      return `${currentWord.id}:spell_full`
    }

    if (currentQuestion.mode === 'spell_input') {
      return `${currentWord.id}:spell_hint`
    }

    return `${currentWord.id}:${currentQuestion.typeId}`
  }

  const focusActiveSpellInput = () => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    if (useWholeTermSpellInput) {
      wholeSpellInputRef.current?.focus({ preventScroll: true })
      return
    }

    const blankIndexes = currentQuestion.puzzle
      .filter((part) => part.type === 'blank')
      .map((part) => part.index)
    const firstEmptyIndex = blankIndexes.find((index) => !(spellInputs[index] || '').length)
    const targetIndex = firstEmptyIndex ?? blankIndexes[0]

    if (targetIndex !== undefined) {
      spellInputRefs.current[targetIndex]?.focus({ preventScroll: true })
    }
  }

  const focusFirstSpellInput = () => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    if (useWholeTermSpellInput) {
      wholeSpellInputRef.current?.focus({ preventScroll: true })
      return
    }

    const firstBlankIndex = currentQuestion.puzzle.find((part) => part.type === 'blank')?.index

    if (firstBlankIndex !== undefined) {
      spellInputRefs.current[firstBlankIndex]?.focus({ preventScroll: true })
    }
  }

  useEffect(() => {
    const storedWords = getWords()
    const firstWord = getNextWord(storedWords)

    setWords(storedWords)
    setCurrentWordId(firstWord ? firstWord.id : null)
    setCurrentQuestion(createQuestion(firstWord))
    setShowAnswer(false)
  }, [])

  useEffect(() => {
    enterTimeRef.current = Date.now()
    savedDurationRef.current = false

    const saveDuration = () => {
      if (savedDurationRef.current) {
        return
      }

      const elapsedSeconds = Math.floor((Date.now() - enterTimeRef.current) / 1000)

      if (elapsedSeconds <= 0) {
        return
      }

      recordStudyDuration(elapsedSeconds)
      savedDurationRef.current = true
    }

    const handleBeforeUnload = () => {
      saveDuration()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveDuration()
    }
  }, [])

  const currentWord = useMemo(() => {
    return words.find((item) => item.id === currentWordId) || null
  }, [words, currentWordId])

  useEffect(() => {
    if (!currentWord || currentQuestion) {
      return
    }

    setCurrentQuestion(createQuestion(currentWord))
  }, [currentWord, currentQuestion])

  useEffect(() => {
    setShowAnswer(false)
    setWaitingNextAfterWrong(false)
    setSpellResult(null)
    setSpellRoundHasError(false)
    spellInputRefs.current = {}
    skipNextChangeRef.current = {}
    setSpellDrafts({})
    setWholeSpellInput('')
    setWholeSpellDraft('')

    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      setSpellInputs({})
      return
    }

    if (useWholeTermSpellInput) {
      setSpellInputs({})
      return
    }

    const initialInputs = {}

    currentQuestion.puzzle.forEach((part) => {
      if (part.type === 'blank') {
        initialInputs[part.index] = ''
      }
    })
    setSpellInputs(initialInputs)
  }, [currentQuestion, useWholeTermSpellInput])

  useEffect(() => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    const timerId = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        focusFirstSpellInput()
      })
    }, 30)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [currentQuestion, useWholeTermSpellInput])

  const speakWord = (silent = false) => {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined' ||
      !currentWord
    ) {
      if (!silent) {
        setSpeechHint('当前浏览器不支持语音播放。')
      }
      return
    }

    const utterance = new SpeechSynthesisUtterance(currentWord.word)
    const voices = window.speechSynthesis.getVoices()
    const learningLanguage = getLearningLanguage()
    const preferredVoice = getSpeechVoiceSelection(learningLanguage)
    const { voice, languageCode, usedFallback } = resolveSpeechVoice(
      voices,
      learningLanguage,
      preferredVoice
    )

    utterance.lang = voice?.lang || getSpeechLanguageCode(learningLanguage)

    if (voice) {
      utterance.voice = voice
    } else {
      utterance.lang = languageCode
    }

    if (usedFallback && !silent) {
      setSpeechHint(getSpeechFallbackHint(learningLanguage, voice))
    } else if (!voice && !silent) {
      setSpeechHint('当前浏览器没有可用语音。')
    } else if (!voice) {
      utterance.lang = languageCode
    } else if (!silent) {
      setSpeechHint('')
    }

    if (!voice) {
      if (!silent) {
        setSpeechHint('当前浏览器没有可用语音。')
      }
      return
    }

    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onerror = () => {
      if (!silent) {
        setSpeechHint('语音播放失败，请稍后重试。')
      }
    }
    utterance.onstart = () => {
      if (!silent && !usedFallback) {
        setSpeechHint('')
      }
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    if (!currentWord || !currentQuestion) {
      return
    }

    const questionAudioStageKey = getQuestionAudioStageKey()

    if (!questionAudioStageKey) {
      return
    }

    if (autoSpokenQuestionStageRef.current.has(questionAudioStageKey)) {
      return
    }

    autoSpokenQuestionStageRef.current.add(questionAudioStageKey)

    if (autoSpeakTimerRef.current) {
      window.clearTimeout(autoSpeakTimerRef.current)
    }

    autoSpeakTimerRef.current = window.setTimeout(() => {
      speakWord(true)
    }, 220)

    return () => {
      if (autoSpeakTimerRef.current) {
        window.clearTimeout(autoSpeakTimerRef.current)
      }
    }
  }, [currentWord, currentQuestion])

  const moveToNextQuestion = (isCorrect) => {
    if (!currentWord || !currentQuestion) {
      return
    }

    const evaluatedCorrect =
      currentQuestion.mode === 'spell_input' ? isCorrect && !spellRoundHasError : isCorrect

    const updatedWords = updateWordResult(currentWord.id, evaluatedCorrect, {
      questionMode: currentQuestion.mode,
      spellVariant: currentQuestion.spellVariant || null,
      allowSpellProgress:
        currentQuestion.mode !== 'spell_input' ? true : !spellRoundHasError,
    })
    const nextWord = getNextWord(updatedWords, currentWord.id)
    const nextQuestion = createQuestion(nextWord)

    recordAnswer(evaluatedCorrect)
    setSpellInputs({})
    setSpellDrafts({})
    setWholeSpellInput('')
    setWholeSpellDraft('')
    setSpellResult(null)
    setSpellRoundHasError(false)
    setWords(updatedWords)
    setCurrentWordId(nextWord ? nextWord.id : null)
    setCurrentQuestion(nextQuestion)
  }

  const handleSelfCheckWrong = () => {
    if (!currentWord) {
      return
    }

    const updatedWords = updateWordResult(currentWord.id, false, {
      questionMode: 'self_check',
    })
    recordAnswer(false)
    setWords(updatedWords)
    setShowAnswer(true)
    setWaitingNextAfterWrong(true)
    speakWord(false)
  }

  const handleNextAfterWrong = () => {
    if (!currentQuestion) {
      return
    }

    const nextWord = getNextWord(words, currentWordId)
    const nextQuestion = createQuestion(nextWord)

    setSpellInputs({})
    setSpellDrafts({})
    setWholeSpellInput('')
    setWholeSpellDraft('')
    setSpellResult(null)
    setSpellRoundHasError(false)
    setCurrentWordId(nextWord ? nextWord.id : null)
    setCurrentQuestion(nextQuestion)
    setShowAnswer(false)
    setWaitingNextAfterWrong(false)
  }

  const checkSpellAndHandle = (nextInputs) => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    if (useWholeTermSpellInput) {
      const normalizedInput = String(nextInputs || '').trim()

      if (!normalizedInput) {
        setSpellResult(null)
        return
      }

      if (normalizedInput === currentQuestion.answer.trim()) {
        moveToNextQuestion(true)
        return
      }

      setSpellResult({
        isCorrect: false,
        message: '补全有误。请继续修改后重新确认。',
      })
      setSpellRoundHasError(true)
      speakWord(false)
      return
    }

    const blankParts = currentQuestion.puzzle.filter((part) => part.type === 'blank')
    const allFilled = blankParts.every((part) => (nextInputs[part.index] || '').length === 1)

    if (!allFilled) {
      setSpellResult(null)
      return
    }

    const fullWord = currentQuestion.puzzle
      .map((part) => {
        if (part.type === 'fixed') {
          return part.value
        }

        return nextInputs[part.index] || ''
      })
      .join('')

    const isCorrect = fullWord.trim() === currentQuestion.answer.trim()

    if (isCorrect) {
      moveToNextQuestion(true)
      return
    }

    setSpellResult({
      isCorrect: false,
      message: '拼写有误。请按 Backspace 回退到错误字母位置后继续输入。',
    })
    setSpellRoundHasError(true)
    speakWord(false)
  }

  useEffect(() => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    if (useWholeTermSpellInput) {
      return
    }

    checkSpellAndHandle(spellInputs)
  }, [spellInputs, currentQuestion, useWholeTermSpellInput])

  useEffect(() => {
    if (!currentQuestion || currentQuestion.mode !== 'self_check') {
      return
    }

    const handleAnswerKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || waitingNextAfterWrong) {
        if (
          waitingNextAfterWrong &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          event.key === 'Enter'
        ) {
          event.preventDefault()
          handleNextAfterWrong()
        }
        return
      }

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        moveToNextQuestion(true)
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        handleSelfCheckWrong()
      }
    }

    window.addEventListener('keydown', handleAnswerKey)

    return () => {
      window.removeEventListener('keydown', handleAnswerKey)
    }
  }, [currentQuestion, waitingNextAfterWrong, currentWord, words])

  const handleCardClick = () => {
    if (!currentQuestion) {
      return
    }

    if (currentQuestion.mode === 'spell_input') {
      focusActiveSpellInput()
      return
    }

    if (currentQuestion.mode !== 'self_check') {
      return
    }

    setShowAnswer(true)
  }

  const focusNextBlank = (index) => {
    const blankIndexes = currentQuestion?.puzzle
      ?.filter((part) => part.type === 'blank')
      .map((part) => part.index) || []
    const nextBlankIndex = blankIndexes.find((blankIndex) => blankIndex > index)

    if (nextBlankIndex !== undefined) {
      window.setTimeout(() => {
        spellInputRefs.current[nextBlankIndex]?.focus()
      }, 0)
    }
  }

  const commitSpellInput = (index, rawValue) => {
    const nextChar = [...rawValue].slice(-1)[0] || ''
    let nextInputs = null

    setSpellInputs((prev) => {
      nextInputs = {
        ...prev,
        [index]: nextChar,
      }

      return nextInputs
    })
    setSpellDrafts((prev) => ({
      ...prev,
      [index]: '',
    }))

    setSpellResult(null)

    if (nextChar) {
      focusNextBlank(index)
    }
  }

  const handleSpellInputChange = (index, value, isComposing) => {
    if (skipNextChangeRef.current[index]) {
      skipNextChangeRef.current[index] = false
      return
    }

    if (isComposing) {
      setSpellDrafts((prev) => ({
        ...prev,
        [index]: value,
      }))
      return
    }

    commitSpellInput(index, value)
  }

  const handleSpellInputCompositionStart = (index) => {
    setSpellDrafts((prev) => ({
      ...prev,
      [index]: '',
    }))
  }

  const handleSpellInputCompositionEnd = (index, value) => {
    skipNextChangeRef.current[index] = true
    commitSpellInput(index, value)
  }

  const handleSpellInputKeyDown = (event, index) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key !== 'Backspace' || (spellInputs[index] || '').length > 0) {
      return
    }

    const blankIndexes = currentQuestion?.puzzle
      ?.filter((part) => part.type === 'blank')
      .map((part) => part.index) || []
    const currentPosition = blankIndexes.indexOf(index)
    const previousBlankIndex =
      currentPosition > 0 ? blankIndexes[currentPosition - 1] : undefined

    if (previousBlankIndex === undefined) {
      return
    }

    event.preventDefault()
    setSpellInputs((prev) => ({
      ...prev,
      [previousBlankIndex]: '',
    }))
    setSpellDrafts((prev) => ({
      ...prev,
      [index]: '',
      [previousBlankIndex]: '',
    }))
    setSpellResult(null)

    window.setTimeout(() => {
      spellInputRefs.current[previousBlankIndex]?.focus()
    }, 0)
  }

  const handleWholeSpellInputChange = (value, isComposing) => {
    if (isComposing) {
      setWholeSpellDraft(value)
      return
    }

    setWholeSpellInput(value)
    setWholeSpellDraft('')
    setSpellResult(null)
  }

  const handleWholeSpellCompositionEnd = (value) => {
    setWholeSpellInput(value)
    setWholeSpellDraft('')
    setSpellResult(null)
  }

  const handleWholeSpellKeyDown = (event) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      checkSpellAndHandle(wholeSpellInput)
    }
  }

  if (words.length === 0) {
    return (
      <section className="page page-centered">
        <div className="page-stack page-stack-compact">
          <p className="page-desc">当前没有单词，请先到导入页添加词汇。</p>
        </div>
      </section>
    )
  }

  if (!currentWord || !currentQuestion) {
    return (
      <section className="page page-centered">
        <div className="page-stack page-stack-compact">
          <p className="page-desc">当前词库已全部掌握，暂时没有可学习的题目。</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page page-centered">
      <div className="page-stack page-stack-compact">
        <div
          className={`word-card ${currentQuestion.mode === 'self_check' ? 'word-card-clickable' : ''}`}
          onClick={handleCardClick}
        >
          <p className="page-desc">{currentQuestion.instruction}</p>
          <div className="word-header">
            <h2 className="word-title">{currentQuestion.prompt}</h2>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                speakWord(false)
              }}
              className="icon-btn"
              aria-label="播放发音"
              title="播放发音"
            >
              <Volume2 size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {currentQuestion.mode === 'spell_input' ? (
            useWholeTermSpellInput ? (
              <div key={questionFocusKey} className="actions">
                <input
                  ref={wholeSpellInputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoFocus
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onFocus={(event) => event.stopPropagation()}
                  value={wholeSpellDraft || wholeSpellInput}
                  onChange={(event) =>
                    handleWholeSpellInputChange(
                      event.target.value,
                      event.nativeEvent.isComposing
                    )
                  }
                  onCompositionEnd={(event) =>
                    handleWholeSpellCompositionEnd(event.currentTarget.value)
                  }
                  onKeyDown={handleWholeSpellKeyDown}
                  className="input-area"
                  style={{ minHeight: 'auto' }}
                  aria-label="输入完整目标语词项"
                />
                <button
                  type="button"
                  onClick={() => checkSpellAndHandle(wholeSpellInput)}
                  className="btn"
                >
                  确认补全
                </button>
              </div>
            ) : (
              <div key={questionFocusKey} className="spell-row">
                {currentQuestion.puzzle.map((part, idx) => {
                  const firstBlankIndex = currentQuestion.puzzle.find(
                    (puzzlePart) => puzzlePart.type === 'blank'
                  )?.index

                  if (part.type === 'fixed') {
                    return (
                      <span key={`fixed-${idx}`} className="spell-char">
                        {part.value}
                      </span>
                    )
                  }

                  return (
                  <input
                    key={`blank-${part.index}`}
                    ref={(node) => {
                      if (node) {
                        spellInputRefs.current[part.index] = node
                        }
                    }}
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoFocus={part.index === firstBlankIndex}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onFocus={(event) => event.stopPropagation()}
                    value={spellDrafts[part.index] || spellInputs[part.index] || ''}
                      onChange={(event) =>
                        handleSpellInputChange(
                          part.index,
                          event.target.value,
                          event.nativeEvent.isComposing
                        )
                      }
                      onCompositionStart={() => handleSpellInputCompositionStart(part.index)}
                      onCompositionEnd={(event) =>
                        handleSpellInputCompositionEnd(part.index, event.currentTarget.value)
                      }
                      onKeyDown={(event) => handleSpellInputKeyDown(event, part.index)}
                      className="spell-input-view"
                      aria-label={`填写第 ${part.index + 1} 个字符`}
                    />
                  )
                })}
              </div>
            )
          ) : showAnswer ? (
            <p>{currentQuestion.answer}</p>
          ) : (
            <p>点击卡片查看释义</p>
          )}
        </div>
        {speechHint ? <p className="text-error">{speechHint}</p> : null}

        {currentQuestion.mode === 'spell_input' ? (
          spellResult ? <p className={spellResult.isCorrect ? 'text-ok' : 'text-error'}>{spellResult.message}</p> : null
        ) : waitingNextAfterWrong ? (
          <div className="actions">
            <button
              type="button"
              onClick={handleNextAfterWrong}
              className="btn btn-secondary"
            >
              下一题
            </button>
          </div>
        ) : (
          <div className="actions">
            <button type="button" onClick={() => moveToNextQuestion(true)} className="btn">
              认识
            </button>
            <button
              type="button"
              onClick={handleSelfCheckWrong}
              className="btn btn-secondary"
            >
              不认识
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default StudyPage
