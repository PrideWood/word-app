function buildWordItem(word, meaning, indexSeed) {
  return {
    id: Date.now() + indexSeed,
    word,
    meaning,
    status: 'new',
    correctCount: 0,
    wrongCount: 0,
    correctStreak: 0,
    spellingProgress: 0,
    selfCheckSuccessCount: 0,
    hintedSpellSuccessCount: 0,
    fullSpellSuccessCount: 0,
  }
}

function splitPipeColumns(line) {
  const trimmedLine = line.trim()
  const content = trimmedLine.replace(/^\|/, '').replace(/\|$/, '')

  return content.split('|').map((column) => column.trim())
}

function isMarkdownDividerLine(columns) {
  return (
    columns.length >= 2 &&
    columns.every((column) => column.length > 0 && /^:?-{3,}:?$/.test(column))
  )
}

function isMarkdownTableRow(line) {
  return line.includes('|')
}

function findNextNonEmptyLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (line) {
      return line
    }
  }

  return ''
}

export function parseWordsText(text) {
  const words = []
  const seenWords = new Set()
  const lines = text.split('\n')
  const invalidLines = []
  let emptyLineCount = 0

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]
    const line = rawLine.trim()

    if (!line) {
      emptyLineCount += 1
      continue
    }

    if (!isMarkdownTableRow(line)) {
      invalidLines.push({
        lineNumber: index + 1,
        content: rawLine,
        reason: '缺少 | 分隔符',
      })
      continue
    }

    const columns = splitPipeColumns(line)

    if (columns.length < 2) {
      invalidLines.push({
        lineNumber: index + 1,
        content: rawLine,
        reason: '至少需要两列内容',
      })
      continue
    }

    if (isMarkdownDividerLine(columns)) {
      continue
    }

    const nextNonEmptyLine = findNextNonEmptyLine(lines, index + 1)
    const nextColumns = nextNonEmptyLine ? splitPipeColumns(nextNonEmptyLine) : []

    if (
      line.startsWith('|') &&
      line.endsWith('|') &&
      isMarkdownDividerLine(nextColumns)
    ) {
      continue
    }

    const [word, meaning] = columns
    const wordKey = word.toLowerCase()

    if (!word || !meaning) {
      invalidLines.push({
        lineNumber: index + 1,
        content: rawLine,
        reason: '目标语词项或源语释义为空',
      })
      continue
    }

    if (seenWords.has(wordKey)) {
      invalidLines.push({
        lineNumber: index + 1,
        content: rawLine,
        reason: '重复词项已忽略',
      })
      continue
    }

    seenWords.add(wordKey)
    words.push(buildWordItem(word, meaning, index))
  }

  return {
    words,
    stats: {
      totalLines: lines.length,
      importedCount: words.length,
      emptyLineCount,
      invalidLineCount: invalidLines.length,
      invalidLines,
    },
  }
}

function isHeaderLine(columns) {
  if (columns.length < 2) {
    return false
  }

  const first = columns[0].trim().toLowerCase()
  const second = columns[1].trim().toLowerCase()

  return first === 'word' && second === 'meaning'
}

export function parseWordsCsv(csvText) {
  const words = []
  const seenWords = new Set()
  const lines = csvText.split('\n')
  let startIndex = 0

  while (startIndex < lines.length && !lines[startIndex].trim()) {
    startIndex += 1
  }

  if (startIndex < lines.length) {
    const firstColumns = lines[startIndex].split(',')
    if (isHeaderLine(firstColumns)) {
      startIndex += 1
    }
  }

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const columns = line.split(',')
    if (columns.length < 2) {
      continue
    }

    const word = columns[0].trim()
    const meaning = columns.slice(1).join(',').trim()
    const wordKey = word.toLowerCase()

    if (!word || !meaning || seenWords.has(wordKey)) {
      continue
    }

    seenWords.add(wordKey)
    words.push(buildWordItem(word, meaning, index))
  }

  return words
}
