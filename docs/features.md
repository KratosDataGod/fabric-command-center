# Features

`customize/features.json` turns parts of the app on and off. Anything missing from the file counts as on.

## Dashboard panels (`modules`)

| Key | Panel |
| --- | --- |
| `core` | Rings showing each series' share of the total |
| `readouts` | Big numbers per series, plus units and value per unit when the model has units |
| `globe` | Draggable globe with a beacon per country (needs a `geo` dimension) |
| `targetList` | Countries ranked by total, split by series (needs `geo`) |
| `category` | Bubble chart by category (needs `category`) |
| `trend` | One line per series over time |
| `insights` | Plain-English observations computed from the numbers on screen |

Every panel cross-filters the others. Click to lock onto a value, Ctrl or Shift + click to add more, click a lock tag to release it. Each panel highlights its own selection rather than filtering itself, so you can still see what you did not pick.

## Views (`views`)

| Key | What it adds |
| --- | --- |
| `workbench` | The Workbench tab, where viewers build their own visuals (needs `features.visualBuilder` too) |
| `report` | Opens report tiles inside the app instead of in Fabric. Off by default; see [Power BI embedding](power-bi-embed.md) |

## Features (`features`)

| Key | What it does |
| --- | --- |
| `filtersPane` | Multi-select slicers for every dimension and extra filter, each list respecting the others |
| `drillThrough` | The Detail table behind the current selection, sortable, with CSV export (needs `detail` in the model) |
| `savedViews` | Save named filter states, reopen them, and share them as a code. When the Fabric portal supports deep links, the address bar also tracks the view, so the link itself can be shared |
| `visualBuilder` | Viewers pick a measure, a dimension, a chart type and a top N. Visuals are saved in their browser |
| `bootSequence` | The short start-up animation |
| `lockBurst` | The comic burst when something is selected |
| `periodCompare` | Readouts show the change against the previous period: the period before the one selected, or with nothing selected, the latest period against the one before it. Computed from the trend already on screen, so it costs no extra query |
| `presentation` | The Present button: a full-screen tour (overview, top 5 markets, top 3 categories, latest period, every 7 seconds). Space pauses, → skips, Esc stops. Full screen is used where the host allows it |

All motion is skipped for people who turn on reduced motion in their system settings.

## Always on

- **Search (Ctrl+K, Cmd+K or /)** finds any tile in any profile, saved views, profiles and actions. Arrow keys and Enter work throughout.
- **Pins and recents.** The star on a tile pins it to the top of every launchpad; the last tiles opened appear under Recently opened.
- **Keyboard and screen readers.** Every mark that can be clicked can be focused and pressed with Enter or Space; drawers and search keep focus inside until closed.

## Share actions (`actions`)

Every panel has a ⋯ menu. These keys control what it offers:

| Key | Action |
| --- | --- |
| `csv` | Download the panel's numbers as CSV |
| `png` | Download the panel as an image |
| `copy` | Copy a one-paragraph summary |
| `teams` | Open Teams' share dialog with the summary |
| `email` | Open a new email with the summary |

`shareUrl` is an optional https link (for example, the app's address in Fabric) added to Teams and email shares.

## Where things are stored

Saved views, workbench visuals, pins, recently opened tiles, the last profile and the chosen look are stored in each viewer's browser. They do not follow someone to another browser, and clearing site data removes them. Share codes are the way to move a view between people.
