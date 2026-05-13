import { PagePlaceholder } from './PagePlaceholder'

export function ReviewsPage() {
  return (
    <PagePlaceholder
      title="Ревью"
      description="Циклы ревью: промежуточная оценка, итоговое ревью на повышение, перенос и отмена."
      breadcrumbs={[{ label: 'Главная', to: '/' }, { label: 'Ревью' }]}
    />
  )
}
