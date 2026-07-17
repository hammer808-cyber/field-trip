# Fieldtrip Design Truth Package

Copy these files into the repository root:

- `FIELDTRIP_PRODUCT_RULES.md`
- `FIELDTRIP_DESIGN_SYSTEM.md`
- `FIELDTRIP_GAME_LOGIC.md`
- `FIELDTRIP_CODEX_WORKFLOW.md`

Copy the deployment script to:

- `scripts/deploy-production.sh`

Then run:

```bash
chmod +x scripts/deploy-production.sh
git add FIELDTRIP_*.md scripts/deploy-production.sh
git commit -m "docs: add canonical Fieldtrip design truth"
git push -u origin HEAD
```

Production deployment:

```bash
./scripts/deploy-production.sh
```

Review the script's project, service, and smoke-test constants before the first production use. The default canonical deployment target is Firebase project and Hosting site `field-trip-495823`.
