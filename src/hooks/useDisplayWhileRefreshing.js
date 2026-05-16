import { useEffect, useState } from 'react'

/**
 * При повторной загрузке (смена фильтра, «Применить») не подменяем контент на «Загрузка…»:
 * остаётся предыдущий результат с лёгким затемнением, затем плавно подставляются новые данные.
 *
 * @template T
 * @param {T | null | undefined} data — актуальные данные после ответа сервера
 * @param {boolean} loading
 * @returns {{ displayData: T | null | undefined, showBlockingSpinner: boolean, isRefreshing: boolean }}
 */
export function useDisplayWhileRefreshing(data, loading) {
  const [displayData, setDisplayData] = useState(data)

  useEffect(() => {
    if (!loading) {
      setDisplayData(data)
    }
  }, [data, loading])

  const showBlockingSpinner = Boolean(loading && (displayData === null || displayData === undefined))
  const isRefreshing = Boolean(loading && displayData !== null && displayData !== undefined)

  return { displayData, showBlockingSpinner, isRefreshing }
}
