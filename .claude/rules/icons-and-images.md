---
paths:
  - "src/components/**"
  - "src/screens/**"
  - "assets/illustrations/**"
---

# Icons And Images

## Icons
- Use `phosphor-react-native` for every interface icon, `weight="regular"`, size from `ICON_SIZE` (20-24), color from the theme: `<CheckCircleIcon size={ICON_SIZE.md} color={colors.success} weight="regular" />`.
- Import each icon from its own file as `<Name>Icon`: `import {CheckCircleIcon} from 'phosphor-react-native/src/icons/CheckCircle';`. Never import an icon from the package root: its index re-exports every icon. Only the `Icon` type comes from the root (`import type {Icon} from 'phosphor-react-native';`).
- `tsconfig.json` points these paths at the icon types, and `jest.config.js` at the compiled icons.
- Never use emoji in the interface, and never another icon set (`@expo/vector-icons`, Ionicons).
- An icon next to a word is decorative and hidden from screen readers; an icon-only button gets an `accessibilityLabel`.

## Logo
- `BillDuckLogo` (`src/screens/Home/components/BillDuckLogo.tsx`, the header of `HOME`) is drawn by hand as `react-native-svg` code (`Svg`, `Path`, `Circle`), never generated: the duck in profile in a thin graphite line, a yellow body, a folded receipt with a zigzag torn edge as the beak, and the `BillDuck` wordmark in Unbounded SemiBold.
- The mark always renders at `LOGO.markSize` (40 pt), next to the wordmark (`TextLine` `display` with `accessibilityRole="header"`); the mark itself is hidden from screen readers.
- Fills and strokes come from palette keys (`accent` for the body, `beak` for the receipt, `textOnAccent` for the lines, graphite in both themes), never literal hex.
- Never import `.svg` files as components, never add a `metro.config.js` for SVG, never add another SVG library.

## Illustrations
- Every picture on a screen is a transparent PNG or WebP in `assets/illustrations/`, rendered by `Illustration` through `expo-image`.
- Files: `bd_<name>@2x.png` (560 px wide) and `bd_<name>@3x.png` (840 px wide), plus the dark pair `bd_<name>-dark@2x.png` and `bd_<name>-dark@3x.png`. At most 150 KB per file.
- `require` the base name (`bd_empty.png`); Metro picks `@2x` or `@3x` by screen density. All `require` calls sit in one static map inside `Illustration.tsx`; never build a path from a string.
- The light theme shows the normal file, the dark theme the `-dark` file.
- Where each picture goes: `bd_empty` (empty `HOME`), `bd_checking` (file check), `bd_rejected` (file rejected), `bd_waiting` (sending, queued and processing), `bd_ready` (ready), `bd_unknown` (reconnecting, not received, not on the server), `bd_error` (server unavailable, error, not deleted), `bd_deleting` (replacing, deleting), `bd_deleted` (deleted). The status screen picks the picture by phase in `describeImportStatus.ts`.
- The app icon and the splash are their own files in `assets/images/` (`icon.png`, `adaptive-icon-foreground.png`, `splash-icon.png`), never a `bd_*` picture.
- Give every image an explicit size (width plus `aspectRatio`) and `contentFit="contain"`, so the layout never jumps while it loads.
- Never put text, digits or currency signs inside a picture; every word is interface text.
- One illustration per screen, at most 280 pt wide. The shrink and hide rules for a large font and a small screen live in `Illustration`.

## Performance
- Never draw large pictures as `Svg`, and never put dozens of masked or gradient `Svg` elements on one screen: they stall weak Android phones.
- Pictures are bitmaps through `expo-image`; `Svg` is for the logo only, icons come from Phosphor.

## The Pictures Themselves
- Ready pictures live in `assets/`: the illustrations in `assets/illustrations/`, the app icon and the splash image in `assets/images/` (`expo-config-and-native.md`). The brand and the list of pictures are described in `docs/PROMPT.md`.
- The duck is the same character on every picture.
- Monoline pictures: graphite lines of one weight, white faces, exactly one yellow element. Glossy 3D pictures (the icon and the splash): only the warm brand palette (duck yellow, graphite, cream `#F4F1EA`, the payment colors). Never violet, purple, blue gradients, neon, money bills, coins or piggy banks.
- The dark variant is made from the same picture (light lines, transparent background), never drawn separately.
- Look at every new picture with your own eyes on light and dark backgrounds, in the running app too: the duck matches, no text crept in, exactly one yellow element.
