# Remlo — The LEO workshop readiness audit

Audit date: 5 September 2026 (Singapore). Branch: `codex/leo-workshop-readiness`.

## 1. Verdict

**Conditional GO for a guided guest-mode workshop, after physical-phone checks and an explicitly approved release of these fixes.** No deployment, merge, production database changes, migrations, real account creation/deletion, or paid AI calls were performed. The current public release does not acquire these fixes merely because this branch exists.

Do not count a download as activation. For this workshop, operational activation means answering a scam question and receiving its explanation. This is a measurable proxy, not proof that the participant understood it: ask the participant to explain the safe action in their own words.

## 2. Architecture and scope inspected

- React 19 + Vite 8, React Router, Tailwind 4, lucide-react; mobile shell capped at 430px. Source is JavaScript/JSX. There is no configured TypeScript/typecheck command.
- Supabase email/password authentication; existing explicit guest mode. Guest budgets/savings/loans/salary and preferences use localStorage. Account records use Supabase tables and RLS. Guest data migration occurs when signing in.
- i18next/react-i18next with 12 statically bundled JSON locales. Urdu uses RTL. Previously onboarding was hardcoded English and country selection could override an explicitly chosen language.
- PostHog was already installed and local environment configuration is present. Before this change, events included savings targets, income and remittance amounts, and sign-in associated activity with account IDs. Local audit browser tests explicitly disabled external analytics. Production ingestion/dashboard access was not verified.
- ExchangeRate-API supplies an SGD reference rate. Provider spreads, fees and transfer times are hardcoded calculations, not provider quote integrations.
- Supabase Edge Functions: `chat` proxies Anthropic; `fetch-scam-alerts` upserts hardcoded alerts and caches Anthropic translations; `delete-account` deletes user records and the verified caller's auth account.
- Vercel SPA rewrites, CSP/security headers, Android asset association, vite-plugin-pwa/Workbox precaching and exchange-rate runtime caching. No native Android source/build project is present, so installed package behavior cannot be inferred from this repository alone.
- Error handling is mostly local UI state. No dedicated error-monitoring setup was found. GitHub's scheduled keepalive pings one REST table; it does not prove chat, translations, authentication, or user-data writes work.
- Reviewed application routes, storage/auth helpers, localization structures/content, data flows, Edge Functions, migrations, deployment configuration and existing RLS test. The audit is not a full penetration test or a certification of every financial/legal statement and translation.

## 3. P0 / P1 findings

| Priority | Issue and evidence | User impact | Fix / status | Fix risk |
|---|---|---|---|---|
| P0 | `Scams.handleReport` collected incident/contact details and only called `setSubmitted(true)`. No transport existed, yet UI said “Report received.” | A worker could believe authorities or Remlo had received an urgent report. | Removed the simulated reporting form and confirmation. Show explicit non-receipt wording, official ScamShield help and tap-to-call 1799. | Low: removes a nonfunctional flow; actual reporting happens on the official service. |
| P0 | Legacy job alert asserted all employment-agency fees were illegal. Quiz claimed guaranteed work-pass protection and fixed criminal penalties. Official MOM/ScamShield guidance does not support those blanket claims. | Misleading decisions in sensitive situations; loss of trust. | Suppress `alert_jobscam_001` in the frontend pending a proper source/cache correction. Revised relevant quiz explanations in all 12 locales, including MOM assistance and practical money-mule avoidance. | Low code risk; new translations still need native-speaker checking. Backend source and unused legacy locale alert data remain for a separate content cleanup. |
| P1 | Browser baseline: country/language setup led to “Welcome back”; guest entry was beneath account fields; Home emphasized AI and hid scam guidance under More. | Avoidable registration friction before a useful action. | Explicit guest CTA during setup routes root entry directly to the existing scam quiz. Account sign-in remains optional. Add Home quiz entry; suppress signup banner on quiz/scams/chat. | Low–moderate: changes initial navigation; uses existing guest mode and does not change Supabase auth/RLS. |
| P1 | English-only setup, abbreviated language pills, country auto-overwrite, no language recovery within scam quiz/alerts. Mobile setup footer was below the viewport. | Wrong-language dead ends and unclear disabled actions. | Localized workshop copy, full language names, language selection before long country grid, preserve explicit preference, fixed visible setup footer, translated country names, Back control, 12-language selector in scam/AI flows, document `lang` and `dir`. | Low: 12-language copy needs human review; two setup screens retained. |
| P1 | `safeStorage` swallowed write failures and returned null, preventing a blocked-storage guest flag from surviving navigation. `DeleteAccount` called a nonexistent `safeStorage.clear()`. | Private/quota-restricted browsers could fail guest activation; account cleanup could report an error after deletion. | Session-memory fallback; scoped Remlo-key cleanup implemented and unit-tested. | Low: fallback is not durable across page closure; it does not solve storage eviction or encrypt local data. Actual account deletion was not exercised. |
| P1 | Unlimited alerts/rate waits; raw alerts errors exposed URL/key prefix/body. Chat mounted-ref cleanup was never reversed during StrictMode effect replay. | Stuck loaders, confusing diagnostics, replies missing in local development. | Bounded fetches (12s alerts/rates, 20s chat), request cancellation on scam language change/unmount, plain alert error with retry, quiz available independent of API, chat lifecycle fix/retry and bounded scroll. | Low: slow requests can now time out; retry is available. Auth session resolution before chat fetch is not covered by that fetch deadline. |
| P1 | PostHog event call sites included financial amounts despite privacy text denying financial-data collection. Optional SDK loaded in the first bundle. | Privacy mismatch and unnecessary startup work. | Dynamic optional SDK import, event/property allowlists, strip URL/referrer/person fields, disable recording/automatic collection/flags, remove account identification, reset legacy analytics identity once, fixed workshop attribution. | Moderate: historical account-linked analytics continuity intentionally ends; dashboard event delivery must be checked with real configuration. No historical vendor data was deleted. |
| P1 | “Compare live rates,” “Best Value,” and provider rankings were computed from fixed spreads/fees rather than live provider quotes. | Users could mistake estimates for actionable quotes or think Remlo transfers money. | Prominent localized estimate disclaimer; reference-rate labeling; remove best-provider/rank badges and ordering; clarify entry labels. | Low: calculations remain illustrative and cannot establish actual provider availability. |
| P1 | Root forced an approximately 1.8s splash; Google font request conflicted with production CSP; unknown routes rendered no useful page. | Slower first use and stale-QR dead ends. | Remove forced splash/font request, use system fallback, recover unknown routes to Home, reset scroll on route changes. | Low: typography may differ; security policy was not loosened. |

## 4. Final expected journey

Android workshop QR → Google Play → install/open Remlo → clear welcome with language selector → choose country/language → **Continue as Guest** → scam quiz → choose an answer → explanation and return instructions. Completion of all eight questions is optional for activation.

iPhone or installation barrier → Web QR → same guest setup and quiz. No email, bank account, money transfer or banking credentials are required. Existing valid feature deep links survive setup; root entry defaults to the quiz. Home also offers the quiz for returning users.

Country can suggest a language until the user makes an explicit language choice. Explicit language wins. Language persists on reload and can be changed in the quiz, alerts, AI, Home and More. Quiz progress itself is session component state and resets on reload; preferences and guest budget records persist when browser storage works.

## 5. QR / public route checks

- Google Play listing opened successfully for `com.remlo.app`, with Install available and FinanceForward shown as developer. Listing displayed update date 4 July 2026. No installation or installed-device app-link claim is made.
- `https://remlo-iota.vercel.app/` opened to the existing welcome UI.
- `https://remlo-iota.vercel.app/?source=the-leo&channel=workshop` returned HTTP 200 with the same final URL and both parameters intact.
- Public `/.well-known/assetlinks.json` returned HTTP 200 and matched the repository's association for `com.remlo.app`. This does not verify the installed app's signing certificate, Digital Asset Links handling, or browser/TWA behavior.
- Public web response included Vercel SPA HTML, CSP, HSTS, X-Frame-Options and other configured headers. Native installation and redirect handling still need the phone checklist.
- Use Google Play as the primary **Android** QR and explicitly label a **Web / iPhone / cannot install** fallback. There is no implemented web-to-Play automatic OS router.
- Web attribution uses only the exact `source=the-leo&channel=workshop` pair and persists through navigation within the tab session. Arbitrary query text and full URLs are excluded. These parameters do not provide Play install-referrer attribution; native attribution requires a separately verified integration.

## 6. Analytics and activation

Existing PostHog now supports:

| Funnel stage | Event |
|---|---|
| Open / returning tab session | `app_opened` with `return_session` |
| Setup started | `onboarding_started` |
| Country choice | `country_selected` |
| Language choice/confirmation | `language_selected` |
| Setup complete | `onboarding_completed` |
| Route opened | `feature_opened` (known routes only) |
| Answer and explanation shown | `scam_question_answered`; first time per browser storage: `first_useful_action_completed` |
| Full quiz | `scam_quiz_completed` |
| Chat outcome | `chat_message_sent`, `chat_response_received`, `chat_failed` |

The first-use event is based on the answer interaction rendering feedback, not a comprehension/read-time test. An incorrect answer still teaches the safe response. Storage-cleared or different-device users can appear new. Private mode/memory fallback loses continuity after closing the page. Return tracking is a browser/tab-session proxy, not a cross-device user metric. Repeated language choices are expected; use unique devices reaching each funnel stage rather than raw event counts.

Allowlisted event data excludes entered financial amounts, contact details, messages, full URLs and account identifiers. PostHog still receives a pseudonymous device/session identifier and connections to its service; this is not absolute anonymity. Its public project token is preserved because ingestion requires it. Country/language and the fixed campaign pair remain deliberate coarse product metadata. No new vendor was introduced.

Before the event, verify a test scan in the configured PostHog project, check the event sequence and inspect properties for unexpected data. No live dashboard or vendor ingestion acceptance was verified here. If analytics is absent/blocked, the app remains usable; tally participants who can explain the first scam answer instead of using downloads as activation.

## 7. Physical phones tonight — exact checklist

### Android

- [ ] Scan the actual printed Android QR using Camera. Confirm Google Play shows Remlo / FinanceForward and the correct package; install and open.
- [ ] Test one fresh install and one already-installed device. Confirm which app/web version is actually served, no stale splash-only screen, broken redirects, or browser verification warnings.
- [ ] Choose India + Tamil (or a participant's real preference). Confirm the language does not revert. Try Back, then continue as guest without email/password.
- [ ] Answer one scam question; read the explanation aloud in the chosen language. Change language once and recover to the intended language. Finish the full quiz on one phone.
- [ ] Close and reopen Remlo; confirm language/country, Home quiz entry and a small disposable guest budget entry persist. Do not use real financial or banking information for QA.
- [ ] Test a small screen, larger text, dark mode and the real keyboard in Budget and Chat. Verify bottom navigation, modal Confirm/Cancel, and send/retry are reachable.
- [ ] On a previously loaded app, disable data/Wi-Fi and reopen the quiz. Restore connectivity and test alerts retry plus one nonsensitive AI question. Do not call emergency numbers as a test.
- [ ] Scan the Web fallback on an Android phone where installation is declined or unavailable.

### iPhone / Web

- [ ] Scan the actual Web QR in Camera and open Safari. Confirm the intended URL; test a fresh normal tab (not only an existing session).
- [ ] Complete guest setup, answer one scam question and switch language. Verify the explanation is readable with a native speaker.
- [ ] Bookmark the page or use Share → Add to Home Screen; demonstrate reopening it. Confirm language and a disposable guest budget entry persist. Explain that private browsing/storage clearing can lose local data.
- [ ] Test 320/375-ish small screens and large text with Safari's actual keyboard. Check inputs do not zoom excessively, the setup footer remains reachable, and modals and bottom tabs work.
- [ ] Open once with a weak connection; then test the already-loaded quiz offline. A first-ever offline visit cannot be expected to work. Restore network and test chat/alerts failure recovery.
- [ ] Test the QR from an embedded scanner/browser if workers are likely to use one; if state does not persist there, use Safari directly.

### Facilitator / release checks

- [ ] Independently review new translations with speakers of the workshop's main languages.
- [ ] Verify an actual workshop-attributed event sequence in PostHog without financial amounts or message content.
- [ ] Keep the official ScamShield website/1799 available as a fallback, and explain Remlo does not receive reports.
- [ ] Confirm the merge/release workflow. If merging the deployment branch automatically deploys via Vercel, hold that merge until release is explicitly approved.

## 8. Remaining risks / deferred work

- **Live backend success not verified.** The alerts function writes on reads and can call paid translation APIs. Browser testing used an isolated mock API for these paths. Authenticated account creation, sync, migration, deletion, and live RLS isolation were not exercised.
- **Database migration drift:** repository creation migrations use `target/saved`, `monthly_income/categories`, and `principal`, while frontend queries use `target_amount/current_amount`, `income/expenses`, and `total_amount/start_date`. Later migrations also assume renamed fields. The deployed schema may have manual changes. Do not run migrations or promise account sync without a staging schema check.
- **Guest migration reliability:** partial savings inserts can leave guest data available for a retry that duplicates already-uploaded rows; budget parent data is removed before all child entries are confirmed. This pre-existing flow needs staging tests and transactional/idempotent design before promoting signup as tomorrow's key action.
- **AI abuse/cost:** server only rate-limits authenticated users, accepts the client system prompt, and its authenticated rate counter is not atomic. Guest AI can bypass user limits. Existing abuse controls and live function health are unknown. Workshop activation does not depend on AI; a backend rate-limit change is deferred.
- **Content:** the suppressed legacy job alert and its cached translations need a coordinated backend correction. Other financial/legal guidance, static provider assumptions, bank eligibility, agency/support contacts and older unused locale content still require a broader source audit. Revised quiz content and official links improve the selected workshop path; they do not certify all platform content.
- **Persistence:** ordinary guest storage is unencrypted local browser storage. Session fallback helps activation under blocked storage but cannot preserve data after closure. Corrupt JSON, quota failures, browser eviction and private-mode persistence need further recovery UX.
- **Performance:** final main JS is about 1.575 MB / 413 KB gzip; optional PostHog chunk about 209 KB / 70 KB gzip. PWA precache is about 4.64 MiB, including a 2.7 MB 512-icon asset. These remain opportunities for careful asset optimization/code splitting. No network-throttled performance benchmark or physical-device timing was completed.
- **Existing lint debt:** 14 errors and 1 warning remain (baseline was 17 errors / 3 warnings), chiefly React hooks/compiler rules in financial pages and uppercase JSX argument detection in App. Build success does not make lint green.
- **Native and browser behavior:** installed Android package, Safari keyboard, accessibility text scaling, dark mode, service-worker update timing and native speakers' interpretation remain physical-phone gates. No whole-product redesign, dependency addition, security-policy weakening or backend deployment was attempted.

## 9. Tests and merge recommendation

- PASS: `npm test` — 25 targeted tests: storage fallback/scoped cleanup/persistence; campaign and privacy filtering; SDK ingestion metadata; unknown-route privacy; JSON success/HTTP error/malformed response/deadline/cancellation; all 12 locale copy/quiz structures; removal of dangerous quiz guarantees.
- PASS: `npm run build` — production build and Workbox generation. Warnings: chunk size and stale Browserslist data.
- PASS: `git diff --check`.
- PASS (built PWA, local browser): loaded a fresh audit-mode production build, completed explicit guest setup, stopped its preview server, reopened `/scam-quiz`, and answered a question with feedback still working. This verifies a warm-cache route with its origin server unavailable, not a first-ever offline visit or physical-phone airplane mode. Restored the ordinary production build afterward; no artifact was deployed.
- FAIL (pre-existing debt): `npm run lint` — 14 errors, 1 warning. The changes introduce no additional lint findings versus baseline and remove several original ones.
- NOT AVAILABLE: standalone typecheck; project is JS/JSX and has no typecheck setup. Build validates JSX/module compilation.
- NOT RUN: existing `scripts/test-rls.mjs` creates and deletes accounts/rows and requires service-role credentials. Running it against the configured production project would violate the audit restrictions; its column payloads also reflect the schema drift described above.
- PASS (local browser): initial setup to guest quiz; India does not override explicit Tamil; Bengali survives reload; all 12 languages render and Urdu sets RTL; quiz at 320/360/390/430px without horizontal button overflow; first answer feedback and return instruction; all eight questions and 8/8 result; guest escape from login and required-field validation; unknown-route recovery; route navigation; guest budget validation, income/expense save and reopening; savings empty state; live reference-rate fetch and destination/amount change; mocked chat success/error/retry; mocked scam alerts/error/details/empty category and quiz fallback. No console warnings/errors in the final captured local flow. Mocked success is not production integration success.

**Recommend this scoped code change for merge after the phone checklist passes.** It materially improves the guest activation path without requiring backend migrations. Keep actual merging/release separate from this audit if it triggers production deployment. Authenticated sync and broader AI/content readiness are not certified by this recommendation.

## 10. Files changed

- `package.json`: targeted test command, no dependency additions.
- `src/App.jsx`, `src/main.jsx`, `src/index.css`: startup, guest routing, navigation, document language/direction, analytics entry and mobile styling.
- `src/components/LanguageSelect.jsx`, `src/lib/languages.js`: shared accessible language selector and language list.
- `src/lib/analytics.js`, `src/lib/analyticsPolicy.js`: optional telemetry, campaign attribution and property filtering.
- `src/lib/safeStorage.js`, `src/lib/fetchJson.js`: storage fallback and bounded requests.
- `src/pages/Onboarding.jsx`, `src/pages/Login.jsx`, `src/pages/Home.jsx`: guest activation and language recovery.
- `src/pages/Scams.jsx`, `src/pages/ScamQuiz.jsx`, `src/pages/Emergency.jsx`: honest reporting/help, independent quiz path and corrected contacts/content.
- `src/pages/Chat.jsx`, `src/pages/Remittance.jsx`, `src/pages/PrivacyPolicy.jsx`: error recovery, estimate clarity and privacy copy.
- `src/locales/en.json`, `bn.json`, `ta.json`, `hi.json`, `my.json`, `si.json`, `fil.json`, `id.json`, `zh.json`, `th.json`, `ur.json`, `ne.json`: localized workshop copy and selected quiz corrections (all under `src/locales/`).
- `tests/workshop.test.mjs`: 25 regression tests.
- `docs/leo-workshop-audit.md`: findings, evidence, limitations and phone checklist.

The pre-existing change in `supabase/.temp/cli-latest` is unrelated and excluded. Ignored audit environment/build files and the temporary local mock server are not release changes.

## 11. Primary sources checked

- [ScamShield](https://www.scamshield.gov.sg/): official scam help and 24/7 helpline 1799.
- [MOM: employment-agency fees](https://www.mom.gov.sg/faq/employment-agencies/how-will-foreign-workers-know-the-amount-that-they-are-expected-to-pay-the-singapore-ea): permitted fees are subject to limits; a blanket claim that all fees are illegal is incorrect.
- [MOM: cancel a Work Permit](https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-worker/cancel-a-work-permit) and [MOM/TADM response on a migrant worker's salary claim](https://www.tal.sg/tadm/resources/2026/mom-tadm-respond-to-wmp-claims-on-alleged-unfair-treatment-of-a-migrant-worker): grounds for replacing a guaranteed work-pass-protection statement with contact-and-records guidance.
- [ScamShield: scam mules](https://www.scamshield.gov.sg/i-want-protection-from-scams/scam-mules/): practical prevention guidance without an unsupported fixed penalty.
- [Singapore Police: unlicensed moneylending](https://www.police.gov.sg/Advisories/Unlicensed-Moneylending): supporting safety guidance reviewed during the content check.

These sources support the specific corrections above; they do not establish completeness or accuracy of all existing app content.
