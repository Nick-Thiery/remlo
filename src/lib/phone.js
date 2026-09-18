// tel: links need ASCII digits, but some locales write phone numbers in their
// own script (e.g. Bengali "১৮০০"). Each entry is the "zero" of a Unicode digit block.
const DIGIT_ZEROS = [
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic (Urdu)
  0x0966, // Devanagari (Hindi, Nepali)
  0x09e6, // Bengali
  0x0be6, // Tamil
  0x0de6, // Sinhala Lith
  0x0e50, // Thai
  0x1040, // Myanmar
  0x1090, // Myanmar Shan
  0xff10, // Fullwidth
]

export function telHref(number) {
  let digits = ''
  for (const ch of String(number)) {
    const code = ch.codePointAt(0)
    if (code >= 0x30 && code <= 0x39) { digits += ch; continue }
    const zero = DIGIT_ZEROS.find((z) => code >= z && code <= z + 9)
    if (zero !== undefined) digits += String(code - zero)
  }
  return `tel:${digits}`
}
