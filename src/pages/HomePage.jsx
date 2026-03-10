import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LANGUAGE_OPTIONS } from '../utils/language.js'
import { getVoiceOptionsForLanguage, speakPreviewText } from '../utils/speech.js'
import {
  getLearningLanguage,
  getSpeechVoiceSelection,
  getWords,
  saveLearningLanguage,
  saveSpeechVoiceSelection,
} from '../utils/storage.js'

function HomePage() {
  const words = getWords()
  const [learningLanguage, setLearningLanguage] = useState(getLearningLanguage())
  const [voiceOptions, setVoiceOptions] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(getSpeechVoiceSelection(learningLanguage))
  const [voiceHint, setVoiceHint] = useState('')
  const hasWords = words.length > 0

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceOptions([])
      setVoiceHint('当前浏览器不支持语音播放。')
      return
    }

    const updateVoiceOptions = () => {
      const options = getVoiceOptionsForLanguage(
        window.speechSynthesis.getVoices(),
        learningLanguage
      )
      const savedVoice = getSpeechVoiceSelection(learningLanguage)
      const hasSavedVoice = options.some((option) => option.value === savedVoice)

      setVoiceOptions(options)
      setSelectedVoice(hasSavedVoice ? savedVoice : '')
      setVoiceHint(options.length === 0 ? '当前浏览器没有可用语音。' : '')
    }

    updateVoiceOptions()
    window.speechSynthesis.addEventListener('voiceschanged', updateVoiceOptions)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoiceOptions)
    }
  }, [learningLanguage])

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value

    setLearningLanguage(nextLanguage)
    saveLearningLanguage(nextLanguage)
    setSelectedVoice(getSpeechVoiceSelection(nextLanguage))
  }

  const handleVoiceChange = (event) => {
    const nextVoice = event.target.value

    setSelectedVoice(nextVoice)
    saveSpeechVoiceSelection(learningLanguage, nextVoice)
  }

  return (
    <section className="page page-centered home-page">
      <div className="page-stack page-stack-compact home-page-stack">

        <div className="word-card feature-card home-card">
          <p className="page-desc section-kicker">当前学习语言</p>
          <div className="toolbar-row">
            <div className="toolbar-control">
              <label htmlFor="learning-language-select">语言选择</label>
              <select
                id="learning-language-select"
                value={learningLanguage}
                onChange={handleLanguageChange}
                className="field-control"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar-control">
              <div className="toolbar-label-row">
                <label htmlFor="speech-voice-select">音色选择</label>
                <button
                  type="button"
                  onClick={() =>
                    speakPreviewText({
                      learningLanguage,
                      preferredVoiceURI: selectedVoice,
                      onHint: setVoiceHint,
                    })
                  }
                  className="icon-btn toolbar-icon-btn"
                  disabled={voiceOptions.length === 0}
                  aria-label="试听音色"
                  title="试听音色"
                >
                  <Volume2 size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              <select
                id="speech-voice-select"
                value={selectedVoice}
                onChange={handleVoiceChange}
                className="field-control"
                disabled={voiceOptions.length === 0}
              >
                <option value="">自动选择最接近语音</option>
                {voiceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="helper-note">
            {voiceHint || '可为当前学习语言选择浏览器支持的不同朗读音色。'}
          </p>
        </div>

        {!hasWords ? (
          <p className="text-error">当前还没有导入单词，请先前往导入页添加词表。</p>
        ) : null}

        <div className="word-card home-card">
          <p className="page-desc section-kicker">新用户说明</p>
          <p className="home-note">学习页包含两类题型：认识判断题与补全题（有提示补全逐步过渡到完整补全）。</p>
          <p className="home-note">学习规则：每个词至少经历两次认识判断、两次有提示补全、两次完整补全后，才会标记为已掌握。</p>
          <p className="home-note">按键对应：空格=认识，回车=不认识；出现“下一题”按钮时可按回车继续。</p>
        </div>

        <div className="actions home-actions">
          <Link to="/study" className="btn">
            继续学习
          </Link>
          <Link to="/import" className="btn btn-secondary">
            导入词表
          </Link>
          <Link to="/stats" className="btn btn-secondary">
            查看统计
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HomePage
