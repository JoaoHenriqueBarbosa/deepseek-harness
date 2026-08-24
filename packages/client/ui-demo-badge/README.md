# @deepseek-ai/dsh-client-ui-demo-badge

Persistence-demonstration plugin: its browser half registers the `demo-badge` entry in the conversation-owned `conversation.composer.dock` list slot, rendering a static pill under the composer card. Its host half is empty — the surface is browser-only. Contract: the [slot system standard](../../../.agents/notes/implemented/architecture/2026-07-22-slot-type-chain-implementation.md).

The package exists to demonstrate durability rather than behavior. A dynamic Cordis package defined through the `cordis_define` tool lives only in the process that defined it, so a `dsh web` restart removes it with no trace; the same UI composed as a client plugin package returns after the restart because it ships in the [web-app bundle](../../bundle/web-app/README.md) and is registered in the client tsconfig aggregate. The badge is therefore deliberately inert: no store, no session projection, no Remote call, no interaction. Its whole render is one localized label plus a status dot, so nothing but composition and durability is under test.

Copy is bilingual through the `demoBadge` namespace of `dsh-client-locale`; the entry takes the standard `locale` seat, so a locale switch re-renders the mounted badge. Colors come from `--dsw-*` semantic aliases, and the dock column follows the same card-cap-minus-four-insets convention as the sibling dock strips, so the pill lines up with the composer card above it.

The `/client` exports are the plugin body (`apply`/`inject`) plus the namespace key type; the component stays package-internal behind the slot registration.

## Model Experience

None; the badge is presentation-only and nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **The badge carries no live state** — it is a fixed label by design, so it demonstrates persistence without proving that any data channel survives a restart.
- **Removal is a source change** — unlike a dynamic package, turning the badge off means disabling its bundle row or deleting the package, not stopping a run.
