import { PagePlaceholder } from './PagePlaceholder'

export function PromotionDecisionsPage() {
  return (
    <PagePlaceholder
      title="Кадровые решения"
      description="История и детали решений по повышению (доступ по ролям)."
      breadcrumbs={[{ label: 'Главная', to: '/' }, { label: 'Решения' }]}
    />
  )
}
