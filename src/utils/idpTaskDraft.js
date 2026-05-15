/**
 * @returns {{
 *   taskType: string,
 *   taskTitle: string,
 *   taskDescription: string,
 *   taskSuccessCriteria: string,
 *   taskPriority: string,
 *   taskPlannedStartDate: string,
 *   taskDurationDays: string,
 *   taskEffortHoursPlanned: string,
 * }}
 */
export function newIdpTaskDraft() {
  return {
    taskType: 'LEARNING',
    taskTitle: '',
    taskDescription: '',
    taskSuccessCriteria: '',
    taskPriority: 'MIDDLE',
    taskPlannedStartDate: '',
    taskDurationDays: '14',
    taskEffortHoursPlanned: '8',
  }
}

/**
 * @param {{
 *   taskType: string,
 *   taskTitle: string,
 *   taskDescription: string,
 *   taskSuccessCriteria: string,
 *   taskPriority: string,
 *   taskPlannedStartDate: string,
 *   taskDurationDays: string,
 *   taskEffortHoursPlanned: string,
 * }} row
 * @returns {import('../api/developmentPlans.js').DevelopmentPlanTaskCreateRequest}
 */
export function idpTaskDraftToApiPayload(row) {
  const taskDurationDays = Number(row.taskDurationDays)
  const taskEffortHoursPlanned =
    row.taskEffortHoursPlanned.trim() === '' ? null : Number(row.taskEffortHoursPlanned)
  return {
    task_type: /** @type {'LEARNING' | 'PROJECT' | 'SOFT_SKILL'} */ (row.taskType),
    title: row.taskTitle.trim(),
    description: row.taskDescription.trim(),
    success_criteria: row.taskSuccessCriteria.trim(),
    priority: /** @type {'HIGH' | 'MIDDLE' | 'LOW'} */ (row.taskPriority),
    planned_start_date: row.taskPlannedStartDate || null,
    duration_days: Math.trunc(taskDurationDays),
    effort_hours_planned: taskEffortHoursPlanned == null ? null : Math.trunc(taskEffortHoursPlanned),
  }
}
