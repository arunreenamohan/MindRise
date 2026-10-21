# Gitflow & Feature Branch Policy

This repository adheres strictly to Gitflow branching conventions:

1. **Production Branch (`main`)**:
   - Reserved strictly for tagged release milestones (e.g. `v0.1.0-phase1`, `v0.2.0-phase2`, `v0.4.0-phase4`).
   - Direct development commits to `main` are prohibited.

2. **Integration Branch (`develop`)**:
   - The primary integration branch for finished, verified features and ongoing engineering work.

3. **Feature Branches (`feature/<feature-name>`)**:
   - Created from `develop` before starting any new feature or phase.
   - All intermediate commits must be scoped to that feature.
   - Pushed to `origin feature/<feature-name>`.
   - Merged into `develop` only after TypeScript (`npm run typecheck`), unit tests (`npm test -- --runInBand`), linting (`npm run lint`), and build checks pass.

4. **Release Milestone**:
   - Merged from `develop` into `main` only upon milestone completion, accompanied by a semver git release tag.
