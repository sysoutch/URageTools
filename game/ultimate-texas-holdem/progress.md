Original prompt: implement the texas holdem poker tool like the others. i donnt need the npm things, only the static files in dist folder. also the rules aren't exactly same yet, and it need more checks if cash is enough for each bet. and the dealer must qualify with a pair of 4 not only if he has it on his own hand but also incombination with the table. if dealer doesnt qualify, ante and bet are pushed, trips are payed out if hit.

## Completed

- Converted the imported Vite/npm project into a dashboard-compatible static tool whose runtime is entirely under `dist/`.
- Corrected dealer qualification to use the best five-card pair rank from dealer plus community cards.
- Preserved default pair-of-fours qualification, its toggle, and configurable minimum hand.
- Dealer failure returns Ante, Blind, and Play; Trips settles independently.
- Unaffordable Play wagers are disabled and rejected atomically instead of becoming partial bets.
- Added deterministic text-state hooks for browser-game regression checks.
- Corrected the 1280×720 opening and dealt-hand layouts after screenshot review; wager controls, instructions, hole cards, and action buttons no longer overlap.

## Verification

- Run `node scripts/check-ultimate-texas-holdem-dealer-qualification.mjs`.
- Run `npm run check:tools`.
- Browser checks passed for opening wagers, short-stack Play rejection, a dealt preflop hand, and the dealer-qualification Settings UI with no console errors.

## Suggested follow-up

- Add scenario fixtures for every Trips and Blind pay-table row.
- Add an in-table, non-blocking bankroll warning instead of the current browser alert.
