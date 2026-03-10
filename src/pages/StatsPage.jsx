import { useNavigate } from 'react-router-dom'
import { formatSeconds } from '../utils/format.js'
import { getCurrentMonthHeatmap, getTodayStats } from '../utils/stats.js'
import { getImportSummary, getWords, resetLearningData } from '../utils/storage.js'

function StatsPage() {
  const navigate = useNavigate()
  const todayStats = getTodayStats()
  const words = getWords()
  const importSummary = getImportSummary()
  const monthHeatmap = getCurrentMonthHeatmap()
  const masteredWords = words.filter((item) => item.status === 'mastered').length
  const learningWords = words.filter((item) => item.status === 'learning').length
  const newWords = words.filter((item) => item.status === 'new').length

  const getHeatLevel = (seconds) => {
    if (seconds <= 0) {
      return 0
    }

    if (seconds < 300) {
      return 1
    }

    if (seconds < 900) {
      return 2
    }

    if (seconds < 1800) {
      return 3
    }

    return 4
  }

  const handleReset = () => {
    const confirmed = window.confirm('确认要清空学习数据吗？')

    if (!confirmed) {
      return
    }

    resetLearningData()
    navigate('/import')
  }

  const handleExport = () => {
    if (words.length === 0) {
      window.alert('当前没有可导出的单词。')
      return
    }

    const escapeCsvCell = (value) => `"${String(value || '').replace(/"/g, '""')}"`
    const csvContent = [
      'word,meaning',
      ...words.map((item) => `${escapeCsvCell(item.word)},${escapeCsvCell(item.meaning)}`),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'my-word-app-export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page page-centered">
      <div className="page-stack page-stack-compact stats-page-stack">
        <div className="stats-overview">
          <div className="stats-metrics">
            <p>累计导入单词总数：{importSummary.totalImportedWordCount}</p>
            <p>最近一次导入数量：{importSummary.lastImportWordCount}</p>
            <p>当前词库单词总数：{words.length}</p>
            <p>已掌握数量：{masteredWords}</p>
            <p>学习中数量：{learningWords}</p>
            <p>未掌握数量：{newWords}</p>
            <p>今日学习时长：{formatSeconds(todayStats.studySeconds)}</p>
          </div>
          <div className="stats-heatmap-block">
            <p className="stats-heatmap-title">
              {monthHeatmap.year}年{monthHeatmap.month}月学习热力图
            </p>
            <div className="calendar-weekdays">
              <span>日</span>
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
            </div>
            <div className="calendar-heatmap">
              {monthHeatmap.cells.map((item, index) => {
                if (!item) {
                  return <span key={`empty-${index}`} className="calendar-cell calendar-cell-empty" />
                }

                return (
                  <span
                    key={item.date}
                    className={`calendar-cell heat-green-${getHeatLevel(item.studySeconds)}`}
                    title={`${item.date}：${formatSeconds(item.studySeconds)}`}
                  />
                )
              })}
            </div>
          </div>
        </div>
        <div className="stats-danger-block">
          <div className="actions danger-actions stats-danger-actions">
            <button type="button" onClick={handleExport} className="btn btn-secondary">
              导出累计词库 CSV
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary btn-danger-text"
            >
              重置学习数据
            </button>
          </div>
          <p className="danger-note">谨慎操作：重置后会清空词库与学习记录。</p>
        </div>
      </div>
    </section>
  )
}

export default StatsPage
