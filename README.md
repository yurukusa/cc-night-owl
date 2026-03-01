# cc-night-owl

**When does Claude Code actually work?**

Scans your `~/.claude` session logs and shows which hours of the day your Claude Code sessions start. Find out if you (or your AI) are a night owl, morning person, or something in between.

## Quick Start

```bash
npx cc-night-owl
```

## Example Output

```
cc-night-owl — when does your Claude Code session start? (Asia/Tokyo)

3481 sessions (all time)

  00:00 🌙 ████████████████████░░░░░░░░  243
  01:00 🌙 ████████████████░░░░░░░░░░░░  192
  ...
  22:00 🌙 ██████████████████████████░░  324
  23:00 🌙 ████████████████████████████  344

─────────────────────────────────────────
  Night sessions (22:00–05:59):  42.5%  🌙 Night Owl
  Peak hour:                     23:00 (344 sessions)

  Period breakdown:
  Night   (22:00–05:59)          1480 sessions  (42.5%)
  Morning (06:00–11:59)           420 sessions  (12.1%)
  Afternoon (12:00–17:59)         656 sessions  (18.8%)
  Evening (18:00–21:59)           925 sessions  (26.6%)
```

## Options

```bash
npx cc-night-owl              # All-time hourly breakdown
npx cc-night-owl --days=30   # Last 30 days only
npx cc-night-owl --utc       # Show UTC instead of local time
npx cc-night-owl --json      # JSON output for piping
```

## Night Owl Score

Based on the % of sessions that start between 22:00 and 05:59 (local time):

- **Full Night Owl** — 50%+ of sessions
- **Night Owl** — 30–50%
- **Evening Worker** — 15–30%
- **Day Coder** — under 15%

## Browser Version

Drag your `~/.claude` folder into: **[yurukusa.github.io/cc-night-owl](https://yurukusa.github.io/cc-night-owl/)**

No install, no upload. Everything runs locally in your browser.

## Part of cc-toolkit

cc-night-owl is part of [cc-toolkit](https://yurukusa.github.io/cc-toolkit/) — 48 free tools for Claude Code users.

---

MIT License. Zero dependencies. Your data stays local.
