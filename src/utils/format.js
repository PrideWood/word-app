export function formatSeconds(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const remainSeconds = totalSeconds % 60

  if (minutes === 0) {
    return `${remainSeconds}秒`
  }

  return `${minutes}分${remainSeconds}秒`
}
