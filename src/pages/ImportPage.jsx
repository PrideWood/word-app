import { useRef, useState } from 'react'
import { parseWordsCsv, parseWordsText } from '../utils/parser.js'
import { saveWords } from '../utils/storage.js'

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

    const words = parseWordsText(text)

    if (words.length === 0) {
      setError('未识别到有效单词，请检查输入格式。')
      setResult('')
      return
    }

    saveWords(words)
    setResult(`导入成功，共 ${words.length} 个单词。`)
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
    <section className="page">
      <p className="page-desc">请按“每行一个单词和释义”输入，或先选择 CSV 文件导入。</p>
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
        placeholder={'abandon 放弃\nbenefit 好处\nconfirm 确认'}
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
    </section>
  )
}

export default ImportPage
