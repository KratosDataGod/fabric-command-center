# Getting started

This takes you from a fresh clone to the app running in your Fabric workspace. Plan on 20 to 30 minutes the first time.

## What you need

- Node.js 22.13 or later and Git.
- A Fabric workspace on a Fabric or Premium capacity where you can create items, with Fabric Apps (preview) enabled for your tenant.
- A semantic model in Fabric, and Build permission on it. The defaults match the public AdventureWorks sample, so that is the fastest model to start with.

## 1. Clone, install and try the demo

```bash
git clone https://github.com/KratosDataGod/fabric-command-center.git
cd fabric-command-center
npm install
npm run demo
```

Open http://localhost:5173. The demo runs the full app on synthetic data, with a banner saying so. Use it to try branding and profile changes before you touch a real model: it reloads as you save files in `customize/`.

## 2. Sign in to Fabric

```bash
npx rayfin login
```

On Windows, the sign-in can print an error after the browser says you are signed in. Run `npx rayfin login` again: if it says you are already signed in, you are.

## 3. Point the app at your semantic model

```bash
cp rayfin/.env.example rayfin/.env      # Windows: copy rayfin\.env.example rayfin\.env
```

Fill in `FCC_MODEL_WORKSPACE_ID` and `FCC_MODEL_ITEM_ID`. Both are in the model's address in Fabric (`/groups/<workspace id>/datasets/<item id>`), or you can search for them:

```bash
npx rayfin connector search "<model name>" --type fabric-semanticmodel --all-workspaces --json
```

If your model is not AdventureWorks, edit `customize/models/sales.json` next. [Connect your model](connect-your-model.md) walks through it, and this lists the measures and columns you can use:

```bash
npm run doctor -- --discover
```

## 4. Check everything

```bash
npm run doctor -- --live
```

The doctor validates every file in `customize/`, checks that each model's connector exists, and runs each generated query against your model. Fix anything marked ✖ before you deploy.

Run the app locally against the real model if you like:

```bash
npm run dev
```

## 5. Make it yours

- [Branding](customize-branding.md): name, logos, colours and fonts.
- [Profiles](profiles.md): which content each role sees. Add report IDs to the Admin profile's tiles once the Admin monitoring workspace and FUAM are in place.
- [Features](features.md): turn panels, features and share actions on or off.

## 6. Deploy

```bash
npx rayfin up --workspace "<workspace name>"
```

Add `--dry-run` first to see what will happen without changing anything. When it finishes, the app appears as an item in that workspace. Open it to sign in and use it.

## 7. Share it

Share the app item with people the way you share any Fabric item. They also need at least Build permission on the semantic model, and access to each report you put on a tile. The app never gives anyone access they would not have in Fabric.

## Troubleshooting

| You see | What it means |
| --- | --- |
| "Fix the files in /customize" | A file in `customize/` has a mistake. The screen lists each one; `npm run doctor` shows the same list. |
| "You do not have access to this semantic model" | The viewer needs Build permission on the model. |
| "The model's data source sign-in has expired" | The model's owner must update its data source credentials in the model's settings. |
| "The semantic model is busy (throttled)" | The capacity is under load. Wait and press Retry. |
| A report tile says "Setup needed" | Its workspace and report IDs are empty. See [Profiles](profiles.md). |
