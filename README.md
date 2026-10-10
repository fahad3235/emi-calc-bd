# EMI Calculator BD — ইএমআই ক্যালকুলেটর

A free, fully offline loan EMI calculator for Bangladesh. Compute monthly EMI, total
interest and total payable with a full amortization schedule, compare two loan offers
side by side, and save named scenarios — in English or বাংলা, right in the browser.

## 1. The problem

Loan shopping in Bangladesh means mental math against bank brochures: different
amounts, rates and tenures that are hard to compare, and "flat-rate" quotes that hide
the true cost. This tool gives an instant, checkable answer for the standard
reducing-balance EMI used by most banks.

## 2. Features

- **EMI calculator** — loan amount (BDT), annual interest rate, tenure (months or
  years), optional down payment → monthly EMI, principal, total interest, total payable
- **Amortization schedule** — per-month EMI / principal / interest / remaining
  balance; long schedules are capped at 12 rows with a "show all" toggle
- **Loan comparison** — two scenarios side by side with a verdict naming the cheaper loan
- **Saved scenarios** — name and save calculations, reload them later, delete them
- **Bilingual UI** — full English ⇄ বাংলা toggle (persisted)
- **Persistence** — last calculation auto-restores on reload (localStorage)
- **Input validation** — inline errors for non-positive amounts, rates outside 0–100,
  tenures outside 1–360 months, down payment ≥ loan amount
- **BDT money formatting** — Indian-style lakh/crore grouping (৳10,54,991) with compact
  labels (10.55 Lakh / 1.2 Crore)
- **Responsive** — single-column mobile layout, no horizontal overflow at 390px

## 3. Stack

Plain HTML + CSS + vanilla JavaScript. No frameworks, no build step, no network
requests, no backend. Runs from any static host (or `file://`).

## 4. Prerequisites

Any modern browser (Chrome, Edge, Firefox, Safari). Nothing to install.

## 5. Install

No install step. Clone or download the repo and open `index.html`, or serve the folder:

```bash
cd emi-calc-bd
python3 -m http.server 8000
# open http://localhost:8000
```

## 6. Dev commands

There is no build. To develop, edit the files and refresh. The test suite is in
`/tmp` style outside the repo (kept out so the repo stays a clean static site):

```bash
python3 test.py   # headless-Chromium QA, needs Playwright + chromium headless shell
```

## 7. Environment variables

None. The app makes zero network requests and uses no keys, tokens or secrets.

## 8. Testing

35 headless-Chromium (Playwright) checks, all passing, zero console errors:

- Hand-verified math: 1,000,000 BDT @ 10% p.a. × 12 months → EMI **৳87,916**
  (matches the standard reducing-balance formula to the taka), total interest
  **৳54,991** = total payable − principal
- Schedule: first-row interest = principal × monthly rate (±1 BDT), final balance
  exactly ৳0, show-more reveals all 60 rows for a 60-month loan
- Down payment reduces principal; 1-year tenure == 12-month EMI; 0% rate → EMI = P/n
- Comparison: 12% loan correctly flagged as costlier than 10% (৳11,195 more interest)
- Validation: amount 0, rate > 100, tenure 0, down payment > amount all rejected
- Persistence: last calculation and saved scenarios survive reload; delete works
- BN/EN toggle rewrites all labels and back; 390px viewport has zero horizontal overflow

## 9. Deployment

GitHub Pages compatible: the site is a static folder — enable Pages on the repo's
`main` branch with `/ (root)` and it serves as-is. No build command needed.

## 10. The formula (worked example)

Reducing-balance EMI:

```
r = annual_rate / 12 / 100
EMI = P × r × (1+r)^n / ((1+r)^n − 1)
```

Worked example — P = ৳1,000,000, 10% p.a., n = 12:

```
r = 0.008333…
EMI = 1,000,000 × 0.008333… × 1.104713… / 0.104713… ≈ ৳87,915.89 → ৳87,916
```

EMI is rounded to the nearest taka (Bangladeshi loans are paid in whole taka); the
final month's payment is adjusted so the balance closes at exactly ৳0. Totals are
the sum of the actual scheduled payments, so `total interest = total payable − principal`
holds exactly.

## 11. Limitations

- **Reducing-balance only.** Many Bangladeshi lenders quote *flat-rate* interest
  (interest charged on the original principal every month). This tool does not
  compute flat-rate EMIs — flat-rate quotes will not match this calculator.
- EMI is rounded to whole taka; sub-taka precision is not modeled.
- Data (last calculation, saved scenarios, language) lives in the browser's
  `localStorage` — per-browser, no sync, no cloud backup.
- Closing the tab does not affect saved data, but there is no export feature yet.
- Rates are user-entered estimates; the tool has no live bank-rate feed.
- For estimation only — not financial advice. Confirm terms with your lender.

## 12. Status

Built and verified 2026-10-10 (MUSE PROJECT FACTORY Ω, run #8). 35/35
headless-Chrome checks passing, zero console errors. Static site, GitHub Pages ready.
