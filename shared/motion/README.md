# Motion

Canonical card-stack motion constants. The React Native wallet
(`src/components/wallet/useCardStack.ts`) reads `card-stack.json`.

## card-stack.json

| Key | Meaning |
|---|---|
| `stackSpacing` | Vertical stride between stacked cards (px) |
| `cardHeight` | Collapsed card height (px) |
| `miniPeek` | Visible strip of each unselected card in the expanded mini-stack |
| `expandedTop` | Top inset of the expanded card |
| `springs.select` | Expand / snap-back (damping, stiffness) |
| `springs.dismiss` | Swipe-up dismiss settle |
| `springs.bounce` | Overscroll rubber-band return |
| `springs.reorder` | Wobble-mode slot snapping |
| `flipDurationMs` | Front↔back hinge duration |
| `dismissDistance` | Swipe-up distance (px) that dismisses |
| `dismissVelocity` | Swipe-up velocity that dismisses |
| `rubberBandFactor` | Overscroll resistance (smaller = stiffer) |

Springs are critically/over-damped — they arrive and stop, no bounce. Card corner
radius is not here; it lives in `shared/tokens/geometry.json` (`cardRadius`).

Flip *easing* stays in platform code (`Easing.out(Easing.cubic)` on RN). Only the
duration is shared.
