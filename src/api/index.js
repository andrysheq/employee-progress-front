export {
  getApiOrigin,
  API_CONTEXT_PATH,
  buildApiUrl,
} from './config.js'

export {
  setAccessTokenGetter,
  getAccessToken,
  configureSessionStorageAccessToken,
} from './token.js'

export { ApiError, isApiResultEnvelope } from './errors.js'

export {
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
} from './client.js'

export * as departmentsApi from './departments.js'
export * as gradeModelApi from './gradeModel.js'
export * as promotionPoliciesApi from './promotionPolicies.js'
export * as developmentPlansApi from './developmentPlans.js'
