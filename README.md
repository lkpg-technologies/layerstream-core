# Deploys

## Create release

To create release:

1. Open PR into `production`
2. Set PR title to `Release v1.2.3`
3. Put release notes in PR body
4. Merge PR into `production`
5. Do not squash merge

## Notes

- Version comes from PR title, not `package.json`
- Release notes come from PR body
- Merge must target `production`
- PR must be merged; closed PR does nothing
