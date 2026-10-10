// Keeps a value such as "S$1,500" or "₹37,597" in left-to-right order inside
// right-to-left text (Urdu). Without it, the browser moves the currency sign
// to the other end ("1,500$", "$S"). The marks are invisible: U+2066
// LEFT-TO-RIGHT ISOLATE and U+2069 POP DIRECTIONAL ISOLATE.
export const ltr = (text) => `⁦${text}⁩`
