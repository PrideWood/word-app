import { useNavigate } from 'react-router-dom'
import { formatSeconds } from '../utils/format.js'
import { getCurrentMonthHeatmap, getTodayStats } from '../utils/stats.js'
import { getWords, resetLearningData } from '../utils/storage.js'

function StatsPage() {
  const navigate = useNavigate()
  const todayStats = getTodayStats()
  const words = getWords()
  const monthHeatmap = getCurrentMonthHeatmap()

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

  return (
    <section className="page">
      <p>今日答题数：{todayStats.total}</p>
      <p>学习词汇数：{words.length}</p>
      <p>今日学习时长：{formatSeconds(todayStats.studySeconds)}</p>
      <p>
        {monthHeatmap.year}年{monthHeatmap.month}月学习热力图：
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
      <div className="actions danger-actions">
        <button type="button" onClick={handleReset} className="btn btn-secondary btn-danger-text">
          重置学习数据
        </button>
      </div>
      <p className="danger-note">谨慎操作：重置后会清空词库与学习记录。</p>
    </section>
  )
}

export default StatsPage
