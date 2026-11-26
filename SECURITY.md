# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private vulnerability reporting on this repository (Security → Report a vulnerability). Include the steps to reproduce, what an attacker could do, and the version or commit you tested.

You should get an acknowledgement within a few business days.

## How the app handles data

- Every semantic-model query runs as the signed-in viewer (delegated auth), so their permissions and row-level security apply.
- Profiles choose what is shown. They are not access control.
- No secrets or tenant identifiers are committed: model IDs live in `rayfin/.env` and embedding settings in `customize/powerbi.local.json`, both git-ignored.
- Deep links and share codes are treated as untrusted input and validated against the configuration before use.
- CSV exports guard against spreadsheet formula injection.
- Saved views and workbench visuals stay in the viewer's browser.

## Scope

Vulnerabilities in Microsoft Fabric, Power BI or the Rayfin SDK themselves should be reported to Microsoft through the [Microsoft Security Response Center](https://msrc.microsoft.com/create-report).
