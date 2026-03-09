import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { createQuestion } from '../utils/questionTypes.js'
import { getNextWord } from '../utils/scheduler.js'
import { getWords, updateWordResult } from '../utils/storage.js'
import { recordAnswer, recordStudyDuration } from '../utils/stats.js'

function StudyPage() {
  const [words, setWords] = useState([])
  const [currentWordId, setCurrentWordId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [waitingNextAfterWrong, setWaitingNextAfterWrong] = useState(false)
  const [spellInputs, setSpellInputs] = useState({})
  const [spellResult, setSpellResult] = useState(null)
  const [spellRoundHasError, setSpellRoundHasError] = useState(false)
  const [speechHint, setSpeechHint] = useState('')
  const enterTimeRef = useRef(0)
  const savedDurationRef = useRef(false)
  const autoSpokenWordIdsRef = useRef(new Set())
  const autoSpeakTimerRef = useRef(null)

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

    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
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
  }, [currentQuestion])

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
    const englishVoice = voices.find((voice) => {
      const name = (voice.name || '').toLowerCase()
      const lang = (voice.lang || '').toLowerCase()
      return name.includes('google us english') && lang.startsWith('en-us')
    })

    if (englishVoice) {
      utterance.voice = englishVoice
      utterance.lang = englishVoice.lang
    } else {
      utterance.lang = 'en-US'
      if (!silent) {
        setSpeechHint('未找到 Google US English，已回退默认英文语音。')
      }
    }

    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onerror = () => {
      if (!silent) {
        setSpeechHint('语音播放失败，请稍后重试。')
      }
    }
    utterance.onstart = () => {
      if (!silent) {
        setSpeechHint('')
      }
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    if (!currentWord) {
      return
    }

    const isNewWord = currentWord.status === 'new' || (currentWord.correctCount || 0) === 0

    if (!isNewWord) {
      return
    }

    if (autoSpokenWordIdsRef.current.has(currentWord.id)) {
      return
    }

    autoSpokenWordIdsRef.current.add(currentWord.id)

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
  }, [currentWord])

  const moveToNextQuestion = (isCorrect) => {
    if (!currentWord || !currentQuestion) {
      return
    }

    const updatedWords = updateWordResult(currentWord.id, isCorrect, {
      questionMode: currentQuestion.mode,
      spellVariant: currentQuestion.spellVariant || null,
      allowSpellProgress:
        currentQuestion.mode !== 'spell_input' ? true : !spellRoundHasError,
    })
    const nextWord = getNextWord(updatedWords, currentWord.id)
    const nextQuestion = createQuestion(nextWord)

    recordAnswer(isCorrect)
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
  }

  const handleNextAfterWrong = () => {
    if (!currentQuestion) {
      return
    }

    const nextWord = getNextWord(words, currentWordId)
    const nextQuestion = createQuestion(nextWord)

    setCurrentWordId(nextWord ? nextWord.id : null)
    setCurrentQuestion(nextQuestion)
    setShowAnswer(false)
    setWaitingNextAfterWrong(false)
  }

  const checkSpellAndHandle = (nextInputs) => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    const blankParts = currentQuestion.puzzle.filter((part) => part.type === 'blank')
    const allFilled = blankParts.every((part) => (nextInputs[part.index] || '').trim().length === 1)

    if (!allFilled) {
      setSpellResult(null)
      return
    }

    const fullWord = currentQuestion.puzzle
      .map((part) => {
        if (part.type === 'fixed') {
          return part.value
        }

        return (nextInputs[part.index] || '').trim()
      })
      .join('')

    const isCorrect = fullWord.toLowerCase() === currentQuestion.answer.toLowerCase()

    if (isCorrect) {
      moveToNextQuestion(true)
      return
    }

    setSpellResult({
      isCorrect: false,
      message: '拼写有误。请按 Backspace 回退到错误字母位置后继续输入。',
    })
    setSpellRoundHasError(true)
  }

  useEffect(() => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    checkSpellAndHandle(spellInputs)
  }, [spellInputs, currentQuestion])

  useEffect(() => {
    if (!currentQuestion || currentQuestion.mode !== 'spell_input') {
      return
    }

    const blankIndexes = currentQuestion.puzzle
      .filter((part) => part.type === 'blank')
      .map((part) => part.index)

    const handleKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()

        let nextInputs = null

        setSpellInputs((prev) => {
          const lastFilled = [...blankIndexes]
            .reverse()
            .find((index) => (prev[index] || '').length > 0)

          if (lastFilled === undefined) {
            nextInputs = prev
            return prev
          }

          nextInputs = {
            ...prev,
            [lastFilled]: '',
          }

          return nextInputs
        })

        if (nextInputs) {
          setSpellResult(null)
        }

        return
      }

      if (!/^[a-zA-Z]$/.test(event.key)) {
        return
      }

      event.preventDefault()
      const letter = event.key.toLowerCase()
      let nextInputs = null

      setSpellInputs((prev) => {
        const targetIndex = blankIndexes.find((index) => (prev[index] || '').length === 0)

        if (targetIndex === undefined) {
          nextInputs = prev
          return prev
        }

        nextInputs = {
          ...prev,
          [targetIndex]: letter,
        }

        return nextInputs
      })

      if (nextInputs) {
        setSpellResult(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentQuestion])

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
    if (!currentQuestion || currentQuestion.mode !== 'self_check') {
      return
    }

    setShowAnswer(true)
  }

  if (words.length === 0) {
    return (
      <section className="page">
        <p className="page-desc">当前没有单词，请先到导入页添加词汇。</p>
      </section>
    )
  }

  if (!currentWord || !currentQuestion) {
    return (
      <section className="page">
        <p className="page-desc">当前词库已全部掌握，暂时没有可学习的题目。</p>
      </section>
    )
  }

  return (
    <section className="page">
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
          <div className="spell-row">
            {currentQuestion.puzzle.map((part, idx) => {
              if (part.type === 'fixed') {
                return (
                  <span key={`fixed-${idx}`} className="spell-char">
                    {part.value}
                  </span>
                )
              }

              return (
                <span key={`blank-${part.index}`} className="spell-input-view">
                  {spellInputs[part.index] || '\u00A0'}
                </span>
              )
            })}
          </div>
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
    </section>
  )
}

export default StudyPage
