// Demo-only industry preview (admins). Stored per browser tab; never written to a profile.
const KEY = 'sq_preview_pack'
export const getPreviewPack = () => {
  try {
    return sessionStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}
export const setPreviewPack = (v) => {
  try {
    if (v) sessionStorage.setItem(KEY, v)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}
