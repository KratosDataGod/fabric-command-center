# Rollout playbook

How to take Fabric Command Center to many companies, or to many business units inside one.

## The model: one repository, one folder per deployment

The code never changes between deployments. What changes is:

| Per deployment | Lives in | Committed? |
| --- | --- | --- |
| Semantic model IDs | `rayfin/.env` | No (git-ignored) |
| Embedding settings | `customize/powerbi.local.json` | No (git-ignored) |
| Brand | `customize/brand/` (or a pack in `customize/brands/`) | Yes |
| Model description | `customize/models/*.json` | Yes |
| Profiles and report IDs | `customize/profiles/*.json` | Your choice (see below) |
| Feature switches | `customize/features.json` | Yes |

Report IDs in profiles identify items in a tenant. They are not credentials, but treat them like the rest of a client's configuration: keep them in the client's own fork or private repository rather than in a public one.

## Option A: a fork per company (recommended for partners)

1. Fork the repository into the client's (or your) organization as a **private** repository.
2. Add the client's brand as a pack, profiles, and model files on a branch.
3. Each client fork can pull upstream improvements with a normal merge, because client changes stay inside `customize/`.

## Option B: one repository, many packs (internal business units)

Keep every brand in `customize/brands/`, then for each deployment:

```bash
npm run brand -- <unit>
cp envs/<unit>.env rayfin/.env      # keep these outside the repository
npm run doctor -- --live
npx rayfin up --workspace "<unit workspace>"
```

## A first-week checklist for each company

- [ ] A Fabric workspace for the app, on a capacity, with Fabric Apps (preview) enabled.
- [ ] The semantic model, with Build permission granted to the people who will use the app (a security group works best).
- [ ] `customize/models/*.json` matches the model; `npm run doctor -- --live` passes.
- [ ] Brand: name, mark, colours approved by the client.
- [ ] Profiles: at least one dashboard tile per profile; report tiles filled in or removed.
- [ ] Admin profile: Admin monitoring workspace opened once by a Fabric admin; Capacity Metrics installed; FUAM deployed if wanted.
- [ ] Deployed to a test workspace, checked by someone from each profile's audience, then deployed to production.
- [ ] Share the app item with the audience groups.

## Upgrading

Pull the latest release, run `npm install`, `npm run check` and `npm run doctor -- --live`, then redeploy. The [CHANGELOG](../CHANGELOG.md) lists anything in `customize/` that changed shape.
