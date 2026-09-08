# Blast Radius

A card game about being the on-call agent. Something is broken. You can stop the
bleeding or you can find out why, and the incident burns either way.

Play: <https://blast-radius.siener.workers.dev>

## The game

Thirty minutes, fifteen discs, six suspects, one hidden cause.

Your hand is five discs drawn from a shuffled deck. **Investigate** discs buy you
a finding. **Mitigate** discs cut the bleed rate. Everything costs minutes, and
the incident keeps running at whatever severity you leave behind, so coasting is
never free.

The suspect board narrows as evidence lands. When you are ready you name the
cause and stake a confidence level: a hunch is worth +200 and costs you 100, a
certainty is worth +700 and costs you 600. That gradient is what stops a lucky
guess from topping the board.

Three discs carry the real lesson:

- **Scale up the replicas** is the reflex, and against a retry storm it makes
  things measurably worse.
- **Fail over to the standby region** halves your impact whatever the cause, and
  burns three unplayed investigation discs. Clean region, no signal, you will
  never know what happened.
- **Check the provider status page** costs one minute and reports all green
  whether or not they are down. It lies more than half the time.

A skull on a disc means it can cost you. A rose means it is safe.

### Scoring

```
1000
  − customers hit ÷ 25        (during play, plus whatever runs after you stop)
  ± the confidence you staked  (+200/+400/+700 right, −100/−300/−600 wrong)
```

Everyone gets the same incident, deck, and hidden cause on a given day, seeded
from the date. Practice mode reshuffles freely and stays off the board.

## Running it

```bash
npm install
npx wrangler dev            # local, with a local D1
npx wrangler deploy         # ship it
```

First-time setup for a fresh account:

```bash
npx wrangler d1 create blast-radius              # put the id in wrangler.jsonc
npx wrangler d1 execute blast-radius --remote --file ./schema.sql
```

## How it is built

One Worker, one static file, one table.

- `public/index.html` — the whole game. No build step, no framework, no
  dependencies at runtime beyond two Google fonts.
- `src/index.js` — serves the assets and handles two routes:
  `GET /api/board?day=YYYY-MM-DD` and `POST /api/score`.
- `schema.sql` — one `scores` table, indexed on `(day, score DESC)`.

Posted scores are range-checked against what the game's arithmetic can actually
produce, and only one row per handle per day survives. That is enough to keep a
casual board honest. It is not real anti-cheat: the client computes its own
score, so anyone willing to open devtools can post any number inside the valid
band. Fixing that properly means replaying the move log server-side.

Scenarios are failure archetypes, not any company's real outage.
