// Push-to-talk voice using the browser's Web Speech APIs.
// The adapter shape (listen / speak / stop) lets a future low-latency realtime
// adapter replace it without changing the call console.

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const voiceSupport = () => ({
  recognition: !!Recognition,
  synthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
  microphone: !!navigator.mediaDevices?.getUserMedia,
})

const REGION_LOCALE = {
  India: 'en-IN',
  'United Kingdom': 'en-GB',
  'United Arab Emirates': 'en-AE',
  'Middle East': 'en-AE',
  'Asia-Pacific': 'en-AU',
}
export const localeFor = (region) => REGION_LOCALE[region] || 'en-US'

// Asks for microphone access, then releases the device immediately.
export async function requestMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return 'granted'
  } catch (e) {
    return e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'unavailable'
  }
}

/**
 * Starts one push-to-talk capture. Returns a controller with stop() and abort().
 * Calls onInterim(text) while speaking and onFinal(text) once, or onError(code).
 */
export function listen({ lang, onInterim, onFinal, onError, onEnd, maxMs = 20000 }) {
  const rec = new Recognition()
  rec.lang = lang
  rec.interimResults = true
  rec.continuous = true
  rec.maxAlternatives = 1
  let finalText = ''
  let done = false
  const timer = setTimeout(() => rec.stop(), maxMs) // safety timeout

  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    onInterim?.((finalText + ' ' + interim).trim())
  }
  rec.onerror = (e) => {
    if (e.error === 'aborted') return
    done = true
    onError?.(e.error) // 'not-allowed' | 'no-speech' | 'network' | 'audio-capture' ...
  }
  rec.onend = () => {
    clearTimeout(timer)
    if (!done) {
      done = true
      const t = finalText.trim()
      if (t) onFinal?.(t)
      else onError?.('no-speech')
    }
    onEnd?.()
  }
  rec.start()
  return {
    stop: () => rec.stop(),
    abort: () => {
      done = true
      clearTimeout(timer)
      rec.abort()
    },
  }
}

export function speak(text, { lang, onStart, onEnd } = {}) {
  if (!('speechSynthesis' in window)) return onEnd?.()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang?.startsWith('en')) || null
  u.rate = 1.02
  u.onstart = () => onStart?.()
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

export const stopSpeaking = () => window.speechSynthesis?.cancel()
