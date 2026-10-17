# Layout check

`npm run check:layout` opens every main screen of the built app in all 12 languages on two small
Android-sized screens (360x740 and 320x640) and reports layout problems. It exists because a
translation that is 40% longer than the English (Tamil, Burmese, Indonesian) or a right-to-left
language (Urdu) breaks layouts in ways nobody sees when working in English.

It is not part of `npm test`: it needs a browser.

## Running it

```
npm run check:layout                                   # everything, about 15 minutes on 2 CPUs
npm run check:layout -- --lang ur,ta --route remittance,more --viewport 320x640
npm run check:layout -- --no-build --keep-build        # reuse the last build (add --keep-build to the run before)
npm run check:layout -- --url http://127.0.0.1:4173    # check a server that is already running
npm run check:layout -- --out /some/dir                # default: ./layout-report (git-ignored)
```

It builds the app into `node_modules/.cache/remlo-layout-check/`, serves it with `vite preview`, and
drives Chromium through `playwright-core` (a dev dependency; it never downloads a browser). The
browser is taken from `CHROMIUM_PATH`, else `/opt/pw-browsers/chromium`, else Playwright's own default.

The run is deterministic: the clock and `Math.random` are fixed, animations are off, the network is
mocked (exchange rates, a Wise quote, everything else refused), the app is a guest on a fresh device
(`localStorage` has `remlo_lang`, `remlo_onboarded`, `remlo_guest`), and the build uses placeholder
Supabase keys, so your `.env` is not used.

Output: `report.md` (summary), `report.json` (every finding), and one annotated full-page screenshot per
page in `screenshots/`. Errors are outlined in red, intentionally shortened text in amber.
The exit code is 1 when there are errors; warnings never fail the run.

## What it checks

Each screen is also opened in a second state where there is one: inputs filled (savings, budget,
remittance, salary, loans, emergency fund), language menu open (More), all boxes ticked (loan shark),
a message typed (chat), a quiz answer given, banking-guide cards opened, the sign-up form (login),
and the second onboarding step.

| Check | Severity | Meaning |
|---|---|---|
| `doc-hscroll` | error | the page scrolls sideways |
| `viewport-cut` | error | text or a control runs past the screen edge (the app shell hides it, so the page does not scroll) |
| `text-clipped` | error | text is cut off by an `overflow: hidden` parent |
| `text-spill` | error | text sticks out of its own box |
| `word-broken` | error | a word is split in the middle because its box is too narrow |
| `overlap` | error | two pieces of text, or two controls, sit on top of each other (popups and fixed bars are exempt) |
| `rtl-dir` | error | `<html dir>` or `lang` is wrong for the language |
| `rtl-align` | error | Urdu text is left-aligned or inside a left-to-right box |
| `rtl-mirror` | error | the bottom tab bar is not mirrored in Urdu |
| `i18n-raw-key` / `i18n-placeholder` / `bad-value` | error | a raw key such as `remittance.xyz`, an unfilled `{{x}}`, or `undefined`/`NaN` is on screen |
| `broken-image` | error | an image failed to load |
| `console-error` | error | uncaught exception or `console.error` |
| `tap-target` | warning | a control is smaller than 44x44 CSS px (counted per screen) |
| `text-truncated` | warning | text is shortened on purpose (ellipsis, line-clamp); review long translations |
| `english-text` | warning | an English sentence on a screen in a non-Latin-script language |
| `rtl-physical-class` | warning | static scan of `src/` for `left`/`right` Tailwind classes that do not mirror (use `start`/`end`, `ms`/`me`, `ps`/`pe`, `text-start`/`text-end`) |

False positives are avoided on purpose: text hidden by an ellipsis is not counted as overlapping,
a scrolled-out part of a scroll area is ignored, and an overlap only counts if the two boxes really
are the top-most thing at that point.

## Known issues

Errors that cannot be fixed yet go in `scripts/layout-check.allow.json` with a reason
(`{"allow": [{"type": "...", "route": "...", "selector": "...", "lang": "...", "reason": "..."}]}`;
only `type` is required). They are listed as "known" and do not fail the run.

## Limits

- Fonts matter. The machine's fallback fonts decide how wide Tamil, Burmese or Sinhala text is, so
  numbers can differ a little from a real phone. Treat borderline cases (a few pixels) as warnings to
  look at, not as proof.
- It does not log in; signed-in screens differ from guest screens only in the sign-out/delete rows.
- The AI chat answer, live Wise quote and scam alerts are mocked, so their real content lengths are not tested.
