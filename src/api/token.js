/** @type {() => string | null | undefined} */
let accessTokenGetter = () => null

/**
 * Задать способ получения Bearer-токена (например из sessionStorage или memory после логина).
 * @param {() => string | null | undefined} getter
 */
export function setAccessTokenGetter(getter) {
  accessTokenGetter = typeof getter === 'function' ? getter : () => null
}

export function getAccessToken() {
  const t = accessTokenGetter()
  return t && String(t).trim() !== '' ? String(t).trim() : null
}

/**
 * Подключить чтение Bearer-токена из sessionStorage (dev и до полноценного логина).
 * @param {string} [storageKey='ep_access_token']
 */
export function configureSessionStorageAccessToken(storageKey = 'ep_access_token') {
  setAccessTokenGetter(() => {
    try {
      return sessionStorage.getItem(storageKey)
    } catch {
      return null
    }
  })
}
