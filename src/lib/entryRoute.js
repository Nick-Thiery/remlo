// Where a new guest lands after setup. Root and /login entries go to Home so the
// first feature a worker opens is their own choice. Any other route is an
// intentional deep link (e.g. a shared /scam-quiz or /remittance link) and is kept.
export function guestLandingPath(pathname) {
  return !pathname || pathname === '/login' ? '/' : pathname
}
