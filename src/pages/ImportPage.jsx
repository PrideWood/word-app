import { useRef, useState } from 'react'
import { parseWordsCsv, parseWordsText } from '../utils/parser.js'
import { saveWords } from '../utils/storage.js'

function findLegacyFormatLines(text) {
  return text
    .split('\n')
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line && !line.includes('|') && /\s+/.test(line))
}

function ImportPage() {
  const fileInputRef = useRef(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const handleImport = () => {
    if (!text.trim()) {
      setError('请输入要导入的内容。')
      setResult('')
      return
    }

    const { words, stats } = parseWordsText(text)
    const legacyFormatLines = findLegacyFormatLines(text)
    const legacyFormatHint =
      legacyFormatLines.length > 0
        ? ` 检测到旧格式输入，例如第 ${legacyFormatLines
            .slice(0, 3)
            .map((item) => `${item.lineNumber} 行`)
            .join('、')}，请改用“目标语词项 | 源语释义”。`
        : ''

    if (words.length === 0) {
      const invalidSummary =
        stats.invalidLineCount > 0
          ? ` 无效行 ${stats.invalidLineCount} 条，例如第 ${stats.invalidLines
              .slice(0, 3)
              .map((item) => `${item.lineNumber} 行（${item.reason}）`)
              .join('、')}。`
          : ''

      setError(
        `未识别到有效单词，请使用“term | meaning”或两列 Markdown 表格格式。${invalidSummary}${legacyFormatHint}`
      )
      setResult('')
      return
    }

    saveWords(words)
    const invalidSummary =
      stats.invalidLineCount > 0
        ? ` 已忽略 ${stats.invalidLineCount} 条无效行。`
        : ''

    setResult(`导入成功，共 ${words.length} 个单词。${invalidSummary}${legacyFormatHint}`)
    setError('')
  }

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const isCsvFile =
      file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv'

    if (!isCsvFile) {
      setError('仅支持 .csv 文件。')
      setResult('')
      return
    }

    try {
      const content = await file.text()

      if (!content.trim()) {
        setError('CSV 文件内容为空，请检查文件后重试。')
        setResult('')
        return
      }

      const words = parseWordsCsv(content)

      if (words.length === 0) {
        setError('CSV 解析失败：未找到有效数据，请使用 word,meaning 两列格式。')
        setResult('')
        return
      }

      saveWords(words)
      setResult(`CSV 导入成功，共 ${words.length} 个单词。`)
      setError('')
    } catch {
      setError('CSV 文件读取或解析失败，请确认文件编码和格式。')
      setResult('')
    }
  }

  return (
    <section className="page page-centered page-centered-stable">
      <div className="page-stack page-stack-compact page-stack-stable">
        <p className="page-desc import-desc">
          支持两种文本导入方式：<code>term | meaning</code>，或两列 Markdown 表格。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvImport}
          className="hidden-input"
        />
        <textarea
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'la maison | the house\n or \n| la voiture | the car |'}
          className="input-area"
        />
        <div className="actions">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
          >
            选择 CSV 文件
          </button>
          <button type="button" onClick={handleImport} className="btn">
            开始导入
          </button>
        </div>
        {result ? <p className="text-ok">{result}</p> : null}
        {error ? <p className="text-error">{error}</p> : null}
      </div>
    </section>
  )
}

export default ImportPage
