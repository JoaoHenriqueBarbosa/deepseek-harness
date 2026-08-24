# Agent Note: promoting a dynamic Cordis package into a client plugin package

Status: implemented

## Problem

A dynamic Cordis package created through `cordis_define` exists only in the process that defined it. That is the right default for prototyping — nothing touches the repository, and a mistake disappears on restart — but it makes the mechanism unusable for a change meant to last, and the failure is silent: the UI simply is not there after the next `dsh web` start, with no error to read.

The gap is not a missing feature; it is a missing worked path. The rules for a durable client surface are already written across `packages/client/AGENTS.md`, the [slot system standard](2026-07-22-slot-type-chain-implementation.md), and the [web client architecture note](2026-07-19-gui-web-client-architecture.md), but a maintainer promoting a working prototype has to rediscover which registration surfaces exist and in what order a missing one fails.

## Decision

`packages/client/ui-demo-badge` is the reference promotion, kept in the tree as a worked example and shipped with its bundle row `disabled: true`. It began as a dynamic package registering one entry in the ui-conversation-owned `conversation.composer.dock` list slot; the promotion changed the surrounding declarations, not the composition idea. Its surface is the Chrome offline dinosaur game — chosen because it exercises a canvas, a keyboard, an animation loop, and one durable value without needing any harness data, so the example isolates composition and durability from business behavior.

Promotion requires **four** registration surfaces, not the three the client checklist names:

1. `tsconfig.client.json` — a `references` entry, for the artifact-plane build.
2. `packages/bundle/web-app/cordis.patch.yml` — the `dsh.client` bundle row that makes the entry load.
3. `packages/bundle/web-app/package.json` — a dependency, so the profile boot can resolve the bare row name.
4. `tsconfig.base.json` — a `paths` mapping to the package's `src`, for the source plane.

The fourth is the one the checklist omits, and it fails differently from the others: the package typechecks, its bundle builds, and the browser loads it, while any test importing the package by name fails at module resolution with "Failed to resolve entry for package", because the bare specifier falls through to unbuilt `lib/`. The three artifact-plane surfaces and the one source-plane surface are independent, and only the source plane is exercised by tests.

The game draws from Chrome's own spritesheet rather than hand-authored art. Sprite atlas offsets, frame sizes, obstacle metrics, and per-part collision boxes are the upstream values from `offline.js`, and the sheet is inlined as base64 in `sprites.ts` (4 kB at 1x, 6 kB at 2x) rather than emitted as an asset, so the dynamic client bundle stays one file with no loader configuration, no `files` entry, and no post-load fetch that can fail.

## Alternatives considered

**Keep the surface as a dynamic package.** Cheapest, and correct for a throwaway experiment, but it cannot survive a restart by construction — the property under demonstration. Rejected because it fails the requirement rather than trading against it.

**Use a `cordis.yml` patch overlay, as `examples/web-cordis` does.** An overlay durably changes composition and configuration, and is the right answer for enabling or repointing an existing plugin. It cannot carry a new component: an overlay row names a package that must already exist and ship a built `lib/client.js`. Rejected as insufficient alone, not wrong — the bundle row in surface 2 is the same mechanism applied to a package that now exists.

**Add the surface to an existing package such as ui-conversation.** Fewer files, no manifest work, no new bundle row. Rejected because it violates the one-feature-one-package regime and would place a demonstration inside the package that *declares* the dock slot, making the registration prove less than it appears to: contributing to your own slot does not exercise the cross-package `slots.inject` path a real promotion depends on.

**Persist the high score through a Host Remote instead of localStorage.** A machine-wide record surviving a browser change was the first request. Rejected on cost once the route was traced: the Client→Host path here is a Typert-generated Remote, so it would need a new Host package declaring the seam, generated artifacts committed, a row in the shared `packages/api/remotes/src/client/index.ts` aggregation, and an explicit on-disk format decision — more work than the entire package, and a central shared file touched, for a demonstration. `localStorage` already survives both a reload and a host restart, which is the property being shown.

**Hand-author pixel-art sprites.** Tried first and rejected on quality: stacked rectangles and hand-plotted bitmaps read as approximations, not as the game. Using the upstream sheet also brings the upstream collision boxes, so the hitboxes match the art instead of being re-guessed.

**Delete the package after the demonstration.** Rejected in favour of disabling the row: the four-surface path and the promotion recipe are the durable value, and a disabled row keeps them compiling and inspectable at the cost of one skipped bundle entry.

## Testing

Deliberately none, and that is a known gap rather than an oversight — the package was built as a live demonstration and its tests were removed when the exercise was cut back to essentials. A promotion intended for merge would restore three specs the repo's rules require: `apply` wiring on a real `Context` plus `SlotRegistry` (declaration-aware activation, the registered id/order/locale namespace, and fiber-teardown unregistration as the HMR-safety disposal proof), a props-direct component spec, and the invariant companion. Per-file coverage over `src/` reached 100% while they existed. Because the row ships disabled, no shipped surface currently depends on this package.

## Consequences

The four-surface path is now worked end to end and recorded, so the next promotion does not rediscover the `tsconfig.base.json` mapping from a confusing module-resolution failure. The prototype's slot choice, seat options, and CSS survived the promotion nearly unchanged; what changed was declarations, docs, and those four surfaces. A dynamic package remains the cheap way to find the right surface, and this note plus the package is the recipe for keeping one.

The package ships disabled, so it costs a skipped bundle row and the maintenance of code no shipped surface exercises. It stays subject to typecheck, `verify-client-packages`, and the config gate, which is what keeps the example honest; if those begin to cost more than the example teaches, deleting the package is the intended exit, and this note carries the recipe independently of it.

The demonstration covers a *surface* persisting, not a data channel. The high score persists per browser through `localStorage`; a promotion that needs a host-owned durable value still has to pay for the Typert Remote seam described above, and this note does not cover that ground.
