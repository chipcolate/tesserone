---
name: changelog
description: Generate customer-facing App Store / Play Store release notes for Tesserone across all supported languages (en/it/fr/es/de) from the git release diff. Use when asked to write, generate, or update the store changelog / "What's New" copy for a release.
---

# Store Changelog

Turns a release diff into the "What's New" copy both stores need, in all five
supported languages, as one paste-ready file.

The diff comes from `gh` — merged PRs in the release window, not raw commits (see
"Compute the diff" for why that distinction matters a lot here). The output is
`store/whats-new-<version>.md`, which is **already gitignored** via `store/whats-new-*`
in `.gitignore` — that pattern is deliberately extension-less, so don't "fix" it and
don't stage the output.

This replaces the older two-file convention (`whats-new-1.3.2.md` +
`whats-new-1.3.2-play.txt`). One file now carries both payloads. The pre-1.4.0 files
also linked to a **compare** URL; current releases link to the **release tag** URL.
Ignore that detail when copying their style — everything else about them is the
reference for register and shape.

## Invocation

| Form | Meaning |
|---|---|
| `/changelog` | newest two tags |
| `/changelog v1.3.2 v1.4.0` | explicit `PREV CUR` |

Resolve the pair from the sorted tag list — **never by decrementing**. The sequence has
holes (`v1.2.3` never existed):

```bash
git tag --list --sort=-v:refname | head -2   # → CUR, PREV
```

Version in the filename drops the `v` (`v1.4.0` → `whats-new-1.4.0.md`), matching
`package.json`'s `version` and the existing files.

## Compute the diff

```bash
PREV=v1.3.2 CUR=v1.4.0

# 1. PRs merged in the release window — the PRIMARY source
PREV_AT=$(gh release view "$PREV" --json publishedAt --jq .publishedAt)
CUR_AT=$(gh release view "$CUR"  --json publishedAt --jq .publishedAt)
gh pr list --state merged --limit 100 --search "merged:$PREV_AT..$CUR_AT" \
  --json number,title --jq '.[] | "#\(.number) \(.title)"'

# 2. commit subjects — catches direct-to-main work that never had a PR
gh api "repos/chipcolate/tesserone/compare/$PREV...$CUR" \
  --jq '.commits[].commit.message | split("\n")[0]'

# 3. blast radius by top-level dir — which areas actually moved
gh api "repos/chipcolate/tesserone/compare/$PREV...$CUR" \
  --jq '[.files[].filename | split("/")[0]] | group_by(.) | map({dir:.[0], n:length}) | sort_by(-.n)'

# 4. cross-check against GitHub's auto-generated notes, to catch a missed PR
gh release view "$CUR" --json body --jq .body
```

**Read PR titles, not commit bodies.** Commits are squash-merged, so their bodies carry
the full PR description plus `Co-authored-by:` trailers — two commits alone ran ~1.4 KB
on v1.4.0. Always `split("\n")[0]`. More importantly, PR-scoping filters noise for free:
v1.3.2→v1.4.0 has **9 commits but only 4 merged PRs**; the missing 5 are direct-to-main
`ci:` pushes that nobody using the app will ever notice. Keep command 2 anyway — a real
user-facing fix *can* land without a PR, and command 4 is the backstop.

**Categorize from the conventional-commit prefix, not labels.** Every PR in this repo
has an empty `labels` array — the repo doesn't label. Titles are reliably `feat:` /
`fix:` / `chore:` / `ci:` / `docs:`, optionally scoped (`feat(site):`).

`.files` is capped at 300 entries by the GitHub API. Fine at this repo's scale, but
don't treat command 3 as guaranteed-complete.

## Filter to user-facing changes

The judgment call that matters. Most of a release is invisible to customers.

- **Keep** — `feat:` / `fix:` that change what someone using the *app* sees or can do.
- **Drop** — `ci:`, `chore:`, `docs:`, `test:`, and anything scoped `(site)` or
  `(screenshots)`. The landing site and the capture pipeline ship separately from the
  app; a Play Store reader has no idea they exist.

v1.4.0's real PR list, as a calibration exercise — note that half of it goes:

| PR | Title | |
|---|---|---|
| #51 | `feat: home-screen widgets for iOS and Android` | **keep** — the headline |
| #52 | `fix: guide to Settings when camera/photo permission is blocked` | **keep** |
| #50 | `feat(site): add localized iOS screenshot carousel` | drop — landing site |
| #49 | `chore: update screenshot pipeline for add-card wizard shots` | drop — tooling |

If nothing survives the filter, **say so and stop**. A CI-only release doesn't get
invented copy.

## Write the English copy

House style, lifted from `whats-new-1.3.1.md` / `whats-new-1.3.2.md`:

```
Adding cards just got easier.

• Adding a card is now a simple, guided 3-step flow — scan, pick the brand, done
• 75 new brand logos, including more Italian chains
• Brand colours and logos now read more clearly on every card

Full changelog: https://github.com/chipcolate/tesserone/releases/tag/v1.3.2
```

- **Hook** — one short sentence, sentence case, plain. No marketing puff.
- **Bullets** — 2–3, `• ` prefix, no trailing periods, em-dash for the aside.
- **Feature-first, not commit-first.** "Adding a card is now a simple, guided 3-step
  flow — scan, pick the brand, done", *not* "Refactored add.tsx into a wizard". The
  reader is standing in a shop, not reading a diff.
- **No trademarked comparisons.** Never "Apple Wallet-style" or similar in store copy,
  however tempting the internal shorthand is.
- Copy is **identical across iOS and Android** — only the wrapper format differs. Write
  it once.

## Translate

Into it / fr / es / de. Idiomatic and native-sounding, not literal — the existing files
are the reference for register. The bullets should read like someone wrote them in that
language, not like English with the words swapped.

Reuse these established labels **verbatim**. The French space before the colon is
correct typography, not a typo:

| Lang | Label |
|---|---|
| en | `Full changelog:` |
| it | `Changelog completo:` |
| fr | `Journal complet :` |
| es | `Registro de cambios completo:` |
| de | `Vollständiges Changelog:` |

## Character limits

- **Google Play "What's new" — 500 chars per language. Hard cap, per language.**
- App Store "What's New in This Version" — 4000 chars.

Since the copy is identical across both stores, **the 500-char Play cap governs both**.
The URL line alone is ~72 chars, leaving ~428 for the copy itself.

Count **after** translating, not before. German and Spanish run longest and are the ones
that will blow the cap — German compounds and Spanish's extra articles routinely add
15–20% over the English. If one overruns, trim that language's bullets rather than
shortening every language to match.

## Emit the file

Write `store/whats-new-<version>.md`. Template (the outer fences here are ````` ```` `````
so the inner ```` ``` ```` blocks survive — the file itself uses plain ```` ``` ````):

````markdown
# What's New — Tesserone 1.4.0

User-facing release notes for App Store Connect ("What's New in This Version")
and Google Play ("What's new"), per supported language. Each ends with a link to
the full GitHub changelog.

## iOS — App Store Connect

### English (en)
```
…copy…
```

### Italian (it)
```
…copy…
```

(then French (fr), Spanish (es), German (de))

## Android — Google Play

Paste this whole block into Play Console.
```
<en-US>
…copy…
</en-US>
<de-DE>
…copy…
</de-DE>
<es-ES>
…copy…
</es-ES>
<fr-FR>
…copy…
</fr-FR>
<it-IT>
…copy…
</it-IT>
```
````

**The two sections order languages differently.** This is the easiest thing to get
wrong:

- **iOS** — `en, it, fr, es, de`. The `APP_LANGUAGES` order from
  `src/i18n/languages.ts`, with headings from `LANGUAGE_LABELS`.
- **Android** — `en-US, de-DE, es-ES, fr-FR, it-IT`. **Alphabetical by locale code**,
  which is what Play Console's own template emits.

Locale mapping: `en→en-US`, `it→it-IT`, `fr→fr-FR`, `es→es-ES`, `de→de-DE`.

Every `<xx-YY>` tag opens and closes on its own line, and the copy inside is byte-identical
to the matching iOS block.

## Check before handing off

```bash
V=1.4.0
git check-ignore -v "store/whats-new-$V.md"   # must print the .gitignore rule
```

Then run the checker. **Count characters, not bytes** — `•`, `é`, `ü`, `¿` are all
multibyte, so `wc -c` and `awk length()` overstate by ~13 on a typical block. That's
harmless at 350 but will lie to you at 495, which is exactly when you need the truth:

```bash
python3 - <<'PY'
import re, pathlib, sys
V = "1.4.0"
t = pathlib.Path(f"store/whats-new-{V}.md").read_text(encoding="utf-8")
ios_sec, _, play_sec = t.partition("## Android — Google Play")
ios = re.findall(r'^### .*?\((\w{2})\)\n```\n(.*?)\n```', ios_sec, re.S | re.M)
play = dict(re.findall(r'^<([a-z]{2}-[A-Z]{2})>\n(.*?)\n^</\1>$', play_sec, re.S | re.M))
M = {"en": "en-US", "it": "it-IT", "fr": "fr-FR", "es": "es-ES", "de": "de-DE"}
ok = True
for loc, body in play.items():
    n = len(body)                                   # chars, not bytes
    ok &= n <= 500 and f"releases/tag/v{V}" in body.splitlines()[-1]
    print(f"{loc}  {n:4} chars  {'OK' if n <= 500 else 'OVER CAP'}")
for lang, body in ios:
    ok &= body.strip() == play.get(M[lang], "").strip()
ok &= len(ios) == 5 and len(play) == 5
print("5 iOS + 5 Play blocks, closed, copy identical, URL present:", "yes" if ok else "NO")
sys.exit(0 if ok else 1)
PY
```

It asserts the four things that actually break a submission: every Play block ≤ 500
chars, all five locales present and closed, iOS copy byte-identical to its Play twin,
and the release-tag URL on the last line of each.

Report the per-language character counts in the handoff. It's the one number the user
can't check at a glance, and it's the one that gets a Play submission rejected.

What the checker **can't** tell you: whether the translations read natively. Say plainly
that the copy is a draft and the non-English blocks want a native read before
submission — don't let five green OKs imply the prose was reviewed.
