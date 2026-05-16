/**
 * Лёгкие диаграммы для отчётов (SVG + CSS, без внешних библиотек).
 */

const PROMO_COLORS = {
  approved: 'var(--reports-chart-done, #22c55e)',
  rejected: 'var(--reports-chart-reject, #ea580c)',
}

const PLAN_COLORS = {
  active: 'var(--reports-chart-plan-active, #6366f1)',
  completed: 'var(--reports-chart-done, #22c55e)',
  other: 'var(--reports-chart-planned, #cbd5e1)',
}

/**
 * @param {object} props
 * @param {number} props.done
 * @param {number} props.inProgress
 * @param {number} props.planned
 */
export function ReportTasksStackedBar({ done, inProgress, planned }) {
  const d = Math.max(0, Math.trunc(Number(done)) || 0)
  const p = Math.max(0, Math.trunc(Number(inProgress)) || 0)
  const pl = Math.max(0, Math.trunc(Number(planned)) || 0)
  const total = d + p + pl
  if (total <= 0) {
    return (
      <div className="reports-chart reports-chart--empty">
        <p className="reports-chart__empty">Нет задач в срезе отчёта</p>
      </div>
    )
  }
  const pct = (n) => `${((100 * n) / total).toFixed(2)}%`
  return (
    <div className="reports-chart">
      <h3 className="reports-chart__title">Задачи по статусам</h3>
      <div className="reports-chart__stack" role="img" aria-label={`Распределение задач: выполнено ${d}, в работе ${p}, запланировано ${pl}`}>
        <div className="reports-chart__stack-inner">
          {d > 0 ? (
            <div className="reports-chart__seg reports-chart__seg--done" style={{ width: pct(d) }} title={`Выполнено: ${d}`} />
          ) : null}
          {p > 0 ? (
            <div className="reports-chart__seg reports-chart__seg--progress" style={{ width: pct(p) }} title={`В работе: ${p}`} />
          ) : null}
          {pl > 0 ? (
            <div className="reports-chart__seg reports-chart__seg--planned" style={{ width: pct(pl) }} title={`Запланировано: ${pl}`} />
          ) : null}
        </div>
      </div>
      <ul className="reports-chart__legend">
        <li>
          <span className="reports-chart__dot reports-chart__dot--done" aria-hidden />
          Выполнено: <strong>{d}</strong>
        </li>
        <li>
          <span className="reports-chart__dot reports-chart__dot--progress" aria-hidden />
          В работе: <strong>{p}</strong>
        </li>
        <li>
          <span className="reports-chart__dot reports-chart__dot--planned" aria-hidden />
          Запланировано: <strong>{pl}</strong>
        </li>
      </ul>
    </div>
  )
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {{ label: string, value: number, color: string }[]} props.segments
 */
export function ReportDonut({ title, segments }) {
  const list = segments.filter((s) => s.value > 0)
  const total = list.reduce((acc, s) => acc + s.value, 0)
  if (total <= 0 || list.length === 0) {
    return (
      <div className="reports-chart reports-chart--empty">
        <h3 className="reports-chart__title">{title}</h3>
        <p className="reports-chart__empty">Нет данных за период</p>
      </div>
    )
  }

  const cx = 60
  const cy = 60
  const r = 42
  const strokeW = 14
  const C = 2 * Math.PI * r
  let dashOffset = 0

  return (
    <div className="reports-chart">
      <h3 className="reports-chart__title">{title}</h3>
      <div className="reports-chart__donut-wrap">
        <svg className="reports-chart__donut" viewBox="0 0 120 120" aria-hidden>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {list.map((seg, i) => {
              const arc = (seg.value / total) * C
              const circle = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeW}
                  strokeDasharray={`${arc} ${C}`}
                  strokeDashoffset={-dashOffset}
                  strokeLinecap="butt"
                />
              )
              dashOffset += arc
              return circle
            })}
          </g>
        </svg>
        <div className="reports-chart__donut-center">
          <span className="reports-chart__donut-total">{total}</span>
          <span className="reports-chart__donut-caption">всего</span>
        </div>
      </div>
      <ul className="reports-chart__legend">
        {list.map((seg, i) => (
          <li key={i}>
            <span className="reports-chart__legend-swatch" style={{ background: seg.color }} aria-hidden />
            {seg.label}: <strong>{seg.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * @param {import('../../api/reports.js').PromotionDecisionHistoryReportView | null} history
 */
export function ReportPromotionDonut({ history }) {
  if (!history || history.decisions_total <= 0) {
    return null
  }
  const a = Math.max(0, Math.trunc(Number(history.approved_total)) || 0)
  const r = Math.max(0, Math.trunc(Number(history.rejected_total)) || 0)
  return (
    <ReportDonut
      title="Кадровые решения"
      segments={[
        { label: 'Одобрено', value: a, color: PROMO_COLORS.approved },
        { label: 'Отклонено', value: r, color: PROMO_COLORS.rejected },
      ]}
    />
  )
}

/**
 * @param {import('../../api/reports.js').EffectivenessSummaryReportView | null} eff
 */
export function ReportPlansPipelineDonut({ eff }) {
  if (!eff) {
    return null
  }
  const total = Math.max(0, Math.trunc(Number(eff.plans_total)) || 0)
  const active = Math.max(0, Math.trunc(Number(eff.plans_active)) || 0)
  const completed = Math.max(0, Math.trunc(Number(eff.plans_completed)) || 0)
  const other = Math.max(0, total - active - completed)
  if (total <= 0) {
    return null
  }
  return (
    <ReportDonut
      title="ИПР в периоде"
      segments={[
        { label: 'Активные', value: active, color: PLAN_COLORS.active },
        { label: 'Завершённые', value: completed, color: PLAN_COLORS.completed },
        ...(other > 0 ? [{ label: 'Прочие', value: other, color: PLAN_COLORS.other }] : []),
      ]}
    />
  )
}
