const STORAGE_KEY = 'my-word-app-data'

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDefaultDayStats() {
  return {
    total: 0,
    correct: 0,
    wrong: 0,
    studySeconds: 0,
  }
}

function readData() {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function recordAnswer(isCorrect) {
  const data = readData()

  if (!data) {
    return
  }

  const todayKey = getTodayKey()
  const statsByDate = data.statsByDate || {}
  const todayStats = statsByDate[todayKey] || getDefaultDayStats()

  const nextTodayStats = {
    total: todayStats.total + 1,
    correct: todayStats.correct + (isCorrect ? 1 : 0),
    wrong: todayStats.wrong + (isCorrect ? 0 : 1),
    studySeconds: todayStats.studySeconds || 0,
  }

  writeData({
    ...data,
    statsByDate: {
      ...statsByDate,
      [todayKey]: nextTodayStats,
    },
    updatedAt: new Date().toISOString(),
  })
}

export function recordStudyDuration(seconds) {
  const data = readData()

  if (!data) {
    return
  }

  const safeSeconds = Math.max(0, Math.floor(seconds))

  if (safeSeconds <= 0) {
    return
  }

  const todayKey = getTodayKey()
  const statsByDate = data.statsByDate || {}
  const todayStats = statsByDate[todayKey] || getDefaultDayStats()

  const nextTodayStats = {
    total: todayStats.total || 0,
    correct: todayStats.correct || 0,
    wrong: todayStats.wrong || 0,
    studySeconds: (todayStats.studySeconds || 0) + safeSeconds,
  }

  writeData({
    ...data,
    statsByDate: {
      ...statsByDate,
      [todayKey]: nextTodayStats,
    },
    updatedAt: new Date().toISOString(),
  })
}

export function getTodayStats() {
  const data = readData()
  const todayKey = getTodayKey()
  const statsByDate = data?.statsByDate || {}
  const todayStats = statsByDate[todayKey] || getDefaultDayStats()
  const accuracy =
    todayStats.total > 0 ? (todayStats.correct / todayStats.total) * 100 : 0

  return {
    total: todayStats.total,
    correct: todayStats.correct,
    wrong: todayStats.wrong,
    studySeconds: todayStats.studySeconds || 0,
    accuracy,
  }
}

export function getRecentStudyHeatmap(days = 30) {
  const safeDays = Math.max(1, days)
  const data = readData()
  const statsByDate = data?.statsByDate || {}
  const today = new Date()
  const result = []

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - offset)

    const dateKey = formatDateKey(date)
    const dayStats = statsByDate[dateKey] || getDefaultDayStats()

    result.push({
      date: dateKey,
      studySeconds: dayStats.studySeconds || 0,
    })
  }

  return result
}

export function getCurrentMonthHeatmap() {
  const data = readData()
  const statsByDate = data?.statsByDate || {}
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingEmptyCount = firstDay.getDay()
  const cells = []

  for (let i = 0; i < leadingEmptyCount; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day)
    const dateKey = formatDateKey(date)
    const dayStats = statsByDate[dateKey] || getDefaultDayStats()

    cells.push({
      day,
      date: dateKey,
      studySeconds: dayStats.studySeconds || 0,
    })
  }

  return {
    year,
    month: month + 1,
    cells,
  }
}
