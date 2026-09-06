# Gleami store screenshot pack

In-repo slots, captions, and capture guidance for App Store and Play.
Identity, icons, empty states, and privacy/terms URLs already live on `main`.
This folder is the later device pass (or EAS Submit) source of truth.

**Product is Gleami** (`com.gleami.staff`). Do not show Salonify chrome, `MOCK_SALONS`, Expo, or React logos.

`ios.supportsTablet` is `false` — no iPad screenshots.

PNG frames are **not** invented here. Capture them on a signed-in demo salon (Expo Go or a preview build). Until then each slot has a `PLACEHOLDER.md`, not a fake UI image.

## Story order (required)

Capture in this order. Names match `frames.json` and `collect-frames.mjs`.

| # | File | Screen | What must be visible |
|---|------|--------|----------------------|
| 1 | `01-agenda-today.png` | Agenda van vandaag | Visit blocks sized from **start/end**. Phase bar = **busy + free**. Buffer is occupancy, **not** duration. |
| 2 | `02-appointment-notes.png` | Afspraak openen | Header with start–end + phase bar, client row, **notities** (at least one real note). |
| 3 | `03-pos-checkout.png` | POS checkout | Line items, totaal, betaalmethode chips. Stay on the form — do **not** complete payment. |
| 4 | `04-clients-dossier.png` | Klanten + dossier | Search used (filtered list or dossier). Profile + notes + history. Not an empty state. |
| 5 | `05-services-phases.png` | Services + phases | Variant editor with **Werk / Vrij / Buffer** as staff tools. |
| 6 | `06-staff-schedule.png` | Staff schedule / day | This week, today marked, availability + visits with start–end. |

Captions: [`captions.nl.md`](captions.nl.md) (primary) and [`captions.en.md`](captions.en.md).

Machine-readable map: [`frames.json`](frames.json). Collector: [`collect-frames.js`](collect-frames.js).

## Folders

```
store/
  apple/iphone-6.7/          1290×2796 (also 1284×2778)
  apple/iphone-6.1/          1179×2556 (also 1170×2532)
  play/phone/                1080×2400 preferred (9:16–20:9, 320–3840 px)
  play/feature-graphic/      1024×500 brand banner only
```

Drop the six PNGs into **each** screenshot folder with the filenames above.

## Demo data

Use one signed-in **demo salon** (email/password staff — no SIWA/Google).

- **One staff** on the calendar filter (the logged-in person is enough).
- **A few clients** with salon-like names. No “Test”, “Foo”, or `MOCK_`.
- **Today’s visits** (3–4): staggered start/end, mixed services. At least one visit whose variant has busy + free (+ buffer on the variant). The day block height must follow appointment start/end, not buffer.
- **One unpaid visit** for frame 3. Capture checkout; do not tap **Afrekenen voltooien** unless you can recreate the unpaid state.
- **One service variant** with Werk + Vrij + Buffer (example: 45 / 20 / 10). Client-facing duration is busy+free; buffer stays a staff tool.
- **Staff rooster** for this week with today’s availability filled in.
- Language: **Nederlands** (Meer → Taal) for the primary pack. Recapture in English only if you need a separate EN listing.
- Theme: **Licht** (Instellingen → Weergave) unless the listing is explicitly dark.

Do not seed new RPCs, chairs/rooms, Connect, or payments. Existing salon data is enough.

## Capture (device or simulator)

1. `npm install` and `npx expo start`, **or** install an EAS `preview` build (`eas build --profile preview`).
2. Sign in as the demo staff user. Confirm the salon name is a real shop, not a mock label.
3. Meer → Taal → **Nederlands**. Instellingen → Weergave → **Licht**.
4. Hide anything that is not Gleami:
   - Preview / release build is preferred: no Expo Go banner, no “Expo” splash leftover.
   - No React / Expo debug menu, no redbox, no Sentry test-crash row.
   - Status bar: full battery, reasonable clock, no personal notifications.
5. Walk the story:

   1. **Agenda** — Calendar tab (first tab). Header view menu → **Week**. Filter the staff chip to the one demo person. Tap today’s date once to select it, tap again to open `/day/[date]`. That timeline is the frame: blocks grow from start/end; the stripe is busy+free only.
   2. **Afspraak** — Tap a visit → `/appointment/[id]`. Add a short real note if the list is empty (`Voeg een notitie toe`).
   3. **POS** — POS icon in the appointment header → `/checkout/[appointmentId]`. Select **Contant**. Do not submit.
   4. **Klanten** — Clients tab → `Zoek klanten` → type a first name → open `/client/[id]`.
   5. **Diensten** — Meer → Diensten → service → variant → `/services/price-option` with all three phase types visible.
   6. **Rooster** — Meer → Medewerkers → staff → **Rooster** (`/staff/[id]/schedule`). Keep **Vandaag** in view.

6. Screenshot **portrait**, full screen (include the status bar, exclude the simulator bezel if the store listing wants device frames — Apple and Play accept raw device screenshots).
7. Repeat on each required size (below), or capture once per size class and export.

### iOS Simulator

| Slot | Device | Pixels |
|------|--------|--------|
| `apple/iphone-6.7` | iPhone 16 Plus or 15 Pro Max | 1290×2796 (1284×2778 also accepted) |
| `apple/iphone-6.1` | iPhone 16 or 16 Pro | 1179×2556 (1170×2532 also accepted) |

Save: Device → Screenshot, or `xcrun simctl io booted screenshot store/inbox/01-agenda-today.png`.

No iPad destination.

### Android emulator / device

| Slot | Device | Pixels |
|------|--------|--------|
| `play/phone` | Pixel 8 / Pixel 9 | 1080×2400 (1080×1920 is fine) |

Play accepts JPEG or 24-bit PNG, 16:9 or 9:16, 320–3840 px on a side.

### Feature graphic

`store/play/feature-graphic/feature-graphic-1024x500.png` is a **Gleami wordmark banner**, not an app screenshot. Replace it only with final brand art (same mark, `#0B1220` field). Do not paste a fake phone UI into 1024×500.

## File naming

```
01-agenda-today.png
02-appointment-notes.png
03-pos-checkout.png
04-clients-dossier.png
05-services-phases.png
06-staff-schedule.png
```

Same six names in every screenshot folder. Raw camera dumps can stay in `store/inbox/` (gitignored) and be renamed with the collector.

## Collect / export

```bash
# Drop simulator/device dumps in store/inbox/ (01-*.png … or IMG_*.png in story order)
node store/collect-frames.js --from store/inbox --slot all --check
```

`--slot apple/iphone-6.7` copies into one folder. `--dry-run` prints the plan. `--check` reports missing frames and off-spec pixels.

`npm run store:collect` is the same command with `--from store/inbox --slot all --check`.
`--check` exits `1` until the six PNGs exist in every slot — expected before the device pass. The 1024×500 feature graphic is already in-repo.

Later EAS Submit / App Store Connect / Play Console upload can point at these folders. Fastlane `deliver` / `supply` can copy from here; do not invent a second pack.

## Branding checklist

- [ ] Login and chrome say **Gleami** only
- [ ] No “Salonify” wordmark, tab, or salon switcher label
- [ ] No `MOCK_SALONS` / mock shop names
- [ ] No Expo Go ribbon, Expo splash, or React logo
- [ ] Visit height follows start/end; phase bar is busy+free; buffer is not drawn as duration
- [ ] Checkout is in-app POS (cash/card/invoice/transfer) — no Stripe/Connect, no SIWA/Google
- [ ] Privacy (`https://booking.salonify.co/privacy`) and Terms are already wired on More/Settings — they are **not** store frames

## Out of scope for this pack

SIWA / Google sign-in, payments Connect, chairs/rooms, new RPCs, iPad, photorealistic mockups of the UI.
