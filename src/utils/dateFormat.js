/**
 * Дата и время в ru-RU без секунд (дд.мм.гггг, чч:мм).
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function formatDateTimeRuNoSeconds(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
