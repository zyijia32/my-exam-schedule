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

export function decodeScheduleConfig(encoded) {
  if (!encoded) {
    return null
  }
  try {
    const parsed = JSON.parse(fromBase64Url(encoded))
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return {
      totalHours: {
        calculus: parsed.totalHours?.calculus ?? '8',
        cs: parsed.totalHours?.cs ?? '6',
        english: parsed.totalHours?.english ?? '5',
      },
      targetDate: parsed.targetDate ?? null,
      leaveDays: {
        fri: parsed.leaveDays?.fri ?? false,
        sun: parsed.leaveDays?.sun ?? false,
      },
    }
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

export function writeConfigToUrl(config) {
  const nextUrl = buildSyncUrl(config)
  window.history.replaceState(null, '', nextUrl)
}
