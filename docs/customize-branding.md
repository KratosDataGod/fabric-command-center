# Branding

Everything about how the app looks and what it says comes from `customize/brand/`. Edit those files; never the CSS.

## The brand file

`customize/brand/brand.json`:

| Field | What it controls |
| --- | --- |
| `name`, `titleAccent` | The title in the header and the browser tab: **Command Center** `// Live` |
| `tagline` | Tooltip on the title |
| `logo`, `mark`, `favicon` | File names in `customize/brand/`. `mark` is the small square logo in the header; `logo` is shown during start-up |
| `defaultLook` | `hud` (dark) or `comic` (light). Each viewer's own choice is remembered after that |
| `allowLookToggle` | `false` hides the look switch and keeps everyone on `defaultLook` |
| `fonts` | Heading, mono, comic and body font families, plus one stylesheet URL that loads them |
| `colors.hud`, `colors.comic` | The palette for each look (below) |
| `copy` | The lock-on burst text, the hint, the look button labels and the start-up lines |
| `footer` | Text and link at the bottom of each launchpad. Remove it to hide it |

Your editor validates the file and autocompletes it, because it points at `customize/schema/brand.schema.json`.

## Colours

Each look has the same slots:

| Slot | Used for |
| --- | --- |
| `background`, `backgroundAlt` | The page gradient |
| `ink`, `dim` | Main and secondary text |
| `line` | Borders, grid lines and the globe outline |
| `hot` | Selections, the lock-on burst, warnings |
| `sun` | Focus rings and highlights |
| `series` | Up to four colours, one per series in your model, in order |

Keep `ink` readable on `background` (a contrast ratio of at least 4.5:1) and keep the series colours distinct from each other and from `hot`, because `hot` means "selected".

## Logos

Drop SVG (best) or PNG files into `customize/brand/` and name them in `brand.json`. A square mark works best at 40 × 40 pixels. SVGs should not load external resources.

## Fonts

`fonts.stylesheet` is a single CSS URL (Google Fonts by default). If your organization blocks it, the app falls back to Segoe UI and Consolas. To use your own fonts, put the font files and a stylesheet somewhere your users can reach and point `stylesheet` at it, or leave it empty to use the system fonts.

## Brand packs

Keep more than one brand side by side in `customize/brands/<name>/`, each with its own `brand.json` and logo files, then switch:

```bash
npm run brand                 # list packs
npm run brand -- kratosbi     # make kratosbi the active brand
npm run brand -- default      # back to the neutral brand
```

Switching copies the pack into `customize/brand/`. This is how a partner keeps one repository and deploys a differently branded app for each client: switch the pack, then deploy. See the [rollout playbook](rollout-playbook.md).

Two packs ship with the project:

- `default`: the neutral "Command Center" brand.
- `kratosbi`: the "Data God // Sales Intel" look the project started as.

## Brand Studio

`npm run demo` includes a Brand Studio (the button at the bottom left, or open http://localhost:5173/?studio). Pick colours for both looks and the fonts, and the running app behind the panel restyles as you go. Each text colour shows its contrast ratio, and the panel lists anything below WCAG AA. When it looks right, **Download brand.json** and save it as `customize/brand/brand.json` (or into a new pack in `customize/brands/<name>/`), next to your logos.

## Create a brand from the command line

`npm run setup` asks for a name and two brand colours and creates a pack in `customize/brands/<name>/`. It adjusts each colour separately for the dark and light looks so it stays readable as text, then makes the pack active.

## Readability checks

`npm run doctor` warns when `ink`, `dim`, `hot` or a series colour has a contrast ratio below 4.5:1 against either background colour. These are warnings: the app still runs, but some people will struggle to read it.
