/**
 * ИПР в состоянии «согласован и ACTIVE»: после полного согласования у плана есть {@code approved_at}.
 * В этом состоянии доступны операции по задачам (прогресс, комментарии, вложения) в API.
 *
 * @param {{ status?: string, approved_at?: string | null } | null | undefined} plan
 * @returns {boolean}
 */
export function isDevelopmentPlanApprovedActive(plan) {
  if (!plan || typeof plan !== 'object') {
    return false
  }
  const st = String(plan.status ?? '').toUpperCase()
  if (st !== 'ACTIVE') {
    return false
  }
  const at = plan.approved_at
  if (at == null) {
    return false
  }
  if (typeof at === 'string' && at.trim() === '') {
    return false
  }
  return true
}
