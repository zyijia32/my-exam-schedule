const CONFIG_PARAM = 'c'

function toBase64Url(text) {
  return btoa(unescape(encodeURIComponent(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64Url(encoded) {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return decodeURIComponent(escape(atob(base64)))
}

export function encodeScheduleConfig(config) {
  return toBase64Url(JSON.stringify(config))
}

export function normalizeScheduleConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  return {
    totalHours: {
      calculus: raw.totalHours?.calculus ?? '8',
      cs: raw.totalHours?.cs ?? '6',
      english: raw.totalHours?.english ?? '5',
    },
    targetDate: raw.targetDate ?? null,
    leaveDays: {
      fri: raw.leaveDays?.fri ?? false,
      sun: raw.leaveDays?.sun ?? false,
    },
  }
}

export function decodeScheduleConfig(encoded) {
  if (!encoded) {
    return null
  }
  try {
    const parsed = JSON.parse(fromBase64Url(encoded))
    return normalizeScheduleConfig(parsed)
  } catch {
    return null
  }
}

export function readConfigFromUrl() {
  if (typeof window === 'undefined') {
    return null
  }
  const encoded = new URLSearchParams(window.location.search).get(CONFIG_PARAM)
  return decodeScheduleConfig(encoded)
}

export function buildSyncUrl(config) {
  const url = new URL(window.location.href)
  url.searchParams.set(CONFIG_PARAM, encodeScheduleConfig(config))
  return url.toString()
}

export function readConfigFromStorage() {
  if (typeof window === 'undefined') {
    return null
  }
  const fromUrl = readConfigFromUrl()
  if (fromUrl) {
    return fromUrl
  }
  const saved = window.localStorage.getItem('exam-schedule-config-v1')
  if (!saved) {
    return null
  }
  try {
    return normalizeScheduleConfig(JSON.parse(saved))
  } catch {
    return null
  }
}

export function persistScheduleConfig(config) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem('exam-schedule-config-v1', JSON.stringify(config))
  writeConfigToUrl(config)
}

export function writeConfigToUrl(config) {
  const nextUrl = buildSyncUrl(config)
  window.history.replaceState(null, '', nextUrl)
}
