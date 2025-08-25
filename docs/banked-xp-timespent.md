## Banked XP from Caliper TimeSpent Events

This document explains how banked XP is computed from Caliper `SpentTime` events for passive content (Articles and Videos), what changed, and concrete scenarios showing the awarded XP.

### What it was (previous behavior)

- When a user completed an exercise with mastery, we identified eligible passive resources (Articles/Videos) between the previous exercise and the current one.
- For each eligible resource, we aggregated the user's total time spent from Caliper `SpentTime` events.
- We computed a partial awarded amount using rounded minutes: `awardedXp = min(round(seconds / 60), expectedXp)`.
- However, when persisting the result and emitting the Caliper “banked XP awarded” event, we saved/emitted the resource's full `expectedXp` instead of the computed partial. This meant any engagement ≥ ~30s effectively awarded full expected XP.

### What we implemented (the change)

- We now persist and emit the computed awarded XP per resource (the partial amount), not the full expected XP.
- The value saved to the assessment result's `metadata.xp` and the value sent in the banked XP Caliper event is the same computed amount used internally: `min(round(seconds / 60), expectedXp)`.

### What it is now (current behavior)

- Banked XP is only awarded when the user completes an exercise with mastery (accuracy ≥ 80% and base assessment XP > 0).
- Eligible passive resources are the Articles and Videos that appear between the previous exercise and the current exercise within the same unit ordering.
- For each eligible resource, we aggregate total seconds from Caliper `SpentTime` events (no date restriction; any historical engagement counts) and compute:
  - `minutesSpent = round(totalSeconds / 60)`
  - `awardedXp = min(minutesSpent, expectedXp)`
- We save an assessment result for each awarded resource with `metadata.xp = awardedXp` and send a “banked XP awarded” Caliper event with the same `awardedXp`.
- We dedupe: resources that already have banked XP saved for this user are skipped in future awards.

### Affected content types

- Applies to both **Articles** and **Videos**. The change is not limited to articles; videos use the same partial-award logic.

### Rounding and thresholds

- Minute bucketing for awards:
  - 0–19s → 0 XP
  - 20–29s → 1 XP
  - 30–89s → 1 XP
  - 90–149s → 2 XP
  - … and so on, always capped by the resource's `expectedXp`.

Logging uses the same bucketing as awards (including 20–29s → 1 minute).

### Award trigger

- The banked XP computation runs when awarding XP for an exercise that the user mastered (≥ 80% accuracy). If the exercise isn't mastered, no banked XP is processed.

### Eligibility window

- We determine the “previous exercise” boundary within the unit using lesson and content sort orders, then consider all interactive passive resources (Articles/Videos) strictly between that previous exercise and the current one.

### Scenarios

Assume the exercise is mastered, the resource is eligible and not previously banked.

1. Article expected XP = 1
   - 20s total → bucket=1 → award 1 XP
   - 45s total → bucket=1 → award 1 XP
   - 150s total → bucket=3 → award min(3, 1) = 1 XP

2. Article expected XP = 2
   - 25s total → bucket=1 → award 1 XP
   - 35s total → bucket=1 → award 1 XP
   - 89s total → bucket=1 → award 1 XP
   - 95s total → bucket=2 → award 2 XP
   - 200s total → bucket=3 → award min(3, 2) = 2 XP

3. Video expected XP = 5
   - 20–29s total → 1 XP
   - 30–89s total → 1 XP
   - 90–149s total → 2 XP
   - 150–209s total → 3 XP
   - 210–269s total → 4 XP
   - ≥ 270s total → 5 XP (cap)

4. Multiple eligible resources
   - Awards are computed per resource and summed. Each awarded resource gets its own assessment result saved and a banked XP Caliper event emitted with its computed XP.

5. Previously banked resource
   - If `metadata.xp > 0` or `metadata.xpReason === "Banked XP"` already exists for the resource's result, we skip awarding again.

### Where this logic lives (references)

- Compute and aggregate time: `src/lib/data/fetchers/caliper.ts`
- Banking orchestration and persistence: `src/lib/xp/bank.ts`
- Exercise award trigger & gating: `src/lib/xp/service.ts`

### FAQs

**Q: Do I need to watch/read in a single session?**  
No. We aggregate all Caliper `SpentTime` events for the resource regardless of when they occurred.

**Q: Does this change affect Videos?**  
Yes. Articles and Videos are both governed by the same partial-award logic.

**Q: What if I barely interact (< 30s)?**  
No banked XP is awarded; rounded minutes is 0.

**Q: What if I spend more minutes than the resource's expected XP?**  
Awards are capped at `expectedXp` for that resource.


