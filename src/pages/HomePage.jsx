import { Link } from 'react-router-dom'
import { formatSeconds } from '../utils/format.js'
import { getTodayStats } from '../utils/stats.js'
import { getWords } from '../utils/storage.js'

function HomePage() {
  const words = getWords()
  const today = getTodayStats()
  const masteredWords = words.filter((item) => item.status === 'mastered').length
  const learningWords = words.filter((item) => item.status === 'learning').length
  const newWords = words.filter((item) => item.status === 'new').length
  const hasWords = words.length > 0

  return (
    <section className="page">
      <p className="page-desc">这里是学习总览，你可以快速查看进度并继续学习。</p>

      {!hasWords ? (
        <p className="text-error">当前还没有导入单词，请先前往导入页添加词表。</p>
      ) : null}

      <div className="stats-list">
        <p>已导入单词总数：{words.length}</p>
        <p>已掌握数量：{masteredWords}</p>
        <p>学习中数量：{learningWords}</p>
        <p>未掌握数量：{newWords}</p>
        <p>今日答题数：{today.total}</p>
        <p>今日学习时长：{formatSeconds(today.studySeconds)}</p>
      </div>

      <div className="word-card">
        <p className="page-desc">新用户说明</p>
        <p>学习页包含两类题型：认识判断题与拼写题（提示拼写逐步过渡到完整拼写）。</p>
        <p>掌握规则：完整拼写连续通过两次后，该词标记为已掌握并不再出现。</p>
        <p>按键对应：空格=认识，回车=不认识；出现“下一题”按钮时可按回车继续。</p>
      </div>

      <div className="actions">
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
    </section>
  )
}

export default HomePage
