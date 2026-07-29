# Ultimate Texas Hold'em

Static browser implementation of Ultimate Texas Hold'em for the URage Studio Games catalog.

## Run

Open `index.html` through the dashboard. The root entry redirects to `dist/index.html`, where all runtime HTML, CSS, JavaScript, and audio assets live. The tool has no npm install, development server, or build step.

## Table rules

- Opening play uses Ante plus a matching Blind; Trips is optional.
- The Play wager is 3x or 4x before the flop, 2x after the flop, or 1x after the river.
- Every wager is checked against the remaining bankroll. An unaffordable Play wager is rejected rather than silently reduced to an illegal partial wager.
- Dealer qualification is enabled by default and requires at least a pair of fours.
- Qualification uses the dealer's best five-card result across both dealer cards and all five community cards. A qualifying pair may therefore be entirely on the board.
- When the dealer does not qualify, Ante, Blind, and Play are returned. Trips still settles independently from the player's best seven-card hand.
- The minimum qualifying hand and qualification toggle remain configurable in the Settings dialog.

## Static layout

- `index.html` — dashboard-compatible catalog entry.
- `dist/index.html` — runnable game page.
- `dist/assets/` — compiled stylesheet and local sounds.
- `dist/js/` — readable native ES modules; no package manager or bundler is required.

## Verification

From the repository root:

```powershell
node scripts/check-ultimate-texas-holdem-dealer-qualification.mjs
npm run check:tools
```
