# Project Handoff Rules

Before handing work to another owner, answer:

```md
Issue:
Branch:
PR:
Current environment:
Validation:
Deploy status:
Runtime probes:
Public docs status:
Shared service probes:
Skin or sprite audit status:
Known reroutes:
Remaining decisions:
```

Do not hand off:

- after only branch creation
- with a dirty deploy checkout
- with a pending issue comment required by repo rules
- with failing validation hidden as a follow-up
- with public docs and runtime incidents mixed together
- with a GitHub write performed by the wrong identity
- with shared account-service compatibility unverified when account changes are in scope
- with Skin-derived runtime sprites lacking source evidence, review status, or a cutover/audit result
