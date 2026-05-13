import { PagePlaceholder } from './PagePlaceholder'

export function ReportsPage() {
  return (
    <PagePlaceholder
      title="Отчёты"
      description="Выполнение ИПР, эффективность, история кадровых решений — по мере подключения API."
      breadcrumbs={[{ label: 'Главная', to: '/' }, { label: 'Отчёты' }]}
    />
  )
}
