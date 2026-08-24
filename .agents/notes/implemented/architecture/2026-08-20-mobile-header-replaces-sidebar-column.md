# Agent Note: Mobile header replaces the sidebar column below 720px

Status: implemented

## Problem

The shell had one sidebar breakpoint: below `SIDEBAR_AUTO_COLLAPSE` (1024px) the sidebar collapsed to `SIDEBAR_COLLAPSED`, a 56px rail that remained a real grid track. That rail never concedes width — the concession chain shrinks details and then the center, while the sidebar stays fixed by contract. On a phone the result is a permanently reserved icon column: roughly 14% of a 390px viewport, taken from the conversation and, decisively, from the composer. The reporting user could not reach the send control at that width. Drag-resize, the rail's only other affordance, is meaningless on touch.

## Decision

A second breakpoint, `MOBILE_HEADER = 720`, marks where the sidebar stops being a column at all.

`computeColumns` accepts `SidebarPreference = number | 'absent'`. `'absent'` resolves to a zero track, distinct from `0` (the collapsed rail). The solver stays breakpoint-free: AppFrame decides `'absent'` and passes it, exactly as it already decided the collapsed preference.

AppFrame reads `viewport < MOBILE_HEADER`, mirrors it into the store through `setMobile`, sets `data-mobile`, renders no sidebar drag handle, and renders the `sidebar` slot inside the center column instead of the sidebar column. Only one branch renders at a time, so the `single` slot is never double-rendered.

The layout store carries `mobile` and `mobileOpen`, mirroring the existing `narrow`/`narrowExpanded` pair. `toggleSidebar` picks among three semantics by viewport; `closeMobileSidebar` dismisses the transient panel without touching any width preference. Crossing either breakpoint drops the corresponding override, so a restored column layout never inherits a stale overlay.

ui-sidebar renders a 48px header (toggle, brand slots, New Session, each in a 36px touch target) and, while open, the same column body as a `min(320px, 85vw)` overlay panel behind a scrim. The panel omits the header's own controls rather than duplicating their accessible names.

### Grid item positions are load-bearing

The three columns are auto-placed in DOM order, so an element's presence — not just its track width — decides which track it occupies. The first implementation removed the sidebar `<div>` on mobile; the center column then landed in the zero-width sidebar track and the details column in the visible one, producing a blank conversation behind a full-width, undismissable Details panel. The sidebar column stays mounted in every layout and is merely empty on mobile, and `data-mobile` suppresses its right border so the zero-width item paints no seam.

### The panel renders in the overlay layer, not the center column

`surface: 'column' | 'header' | 'panel'` tells the occupant which part to render. On mobile the frame calls the `sidebar` slot twice: `header` inside the center column, and `panel` inside `.overlayLayer`. The overlay layer is the frame's only stacking context above the columns (`z-index: 20`) and restores pointer events on its direct children. Rendering the scrim and panel inside the center column left both at `z-index: auto` beneath the conversation: visually see-through and entirely unclickable.

### Why the sidebar owns the header

The header needs locale copy, `startSession`, and the brand slots. ui-sidebar already holds all three; ui-layout holds none of them, and giving it the header would mean injecting `workspaces` and a locale seat into the geometry package. ui-layout contributes only what it owns — the breakpoint, the zero track, the placement — and passes `mobile` and `mobileOpen` through the existing `SidebarOwnerProps`.

### Panel dismissal without widening a slot contract

Opening a session from the panel is a navigation, and the panel covers the conversation it just switched to. `sidebar.workspaces` carries no selection callback.

The dismissal lives in the plugin's apply world as a `ctx.effect` subscribing to `ctx.sessions.list`, comparing `current` across notifications and calling `ctx.layout.closeMobileSidebar()` on a real change. The effect's disposer removes the listener with the fiber.

## Alternatives considered

**A 56px rail that is merely thinner on mobile.** Rejected because it does not address the complaint: any fixed rail still costs the composer width on a 390px viewport, and touch users still cannot drag-resize it. The width was the problem, not its size.

**Hiding the sidebar with no way to reopen it.** The user's first instinct, and the literal reading of "esconde a barra". Rejected because a phone would then have no route to an existing session until the window widened past the breakpoint — a worse product than the cramped one being reported. The overlay panel satisfies "the sidebar takes no chat width" while keeping session access, so the stated goal survives without that loss.

**Adding a selection callback to `sidebar.workspaces`.** Rejected because it widens a shared slot contract to serve one consumer; the browsing region has no other reason to report selections. Watching the authoritative `sessions.list` feed in the plugin's own apply world achieves the same dismissal and leaves the contract untouched.

**Reading `useSessions` inside `SidebarRoot`.** Tried first and rejected by existing specs (`shell must not read global hooks`). That shell is geometry-only; business subscriptions belong in the apply world, which is where the effect now lives. The failing specs were correct and were left as-is.

**Rendering the header from ui-layout.** Rejected for the dependency reason above: it would pull `workspaces` and locale into the geometry package purely for presentation it does not own.

## Consequences

The conversation keeps the full frame width at rest below 720px, and the composer regains the space that prompted the report. Session access costs one tap and a transient overlay instead of a permanent column.

`SidebarOwnerProps` gained two required fields, so every `sidebar` renderer and its specs must supply them; `ILayout` gained `closeMobileSidebar`, which every layout test fake must now provide. Both were updated in this change.

The mobile panel is presentation-local state in the layout store, so it does not survive reload — consistent with the rest of that store, which never touches `localStorage`.

## Testing

`pnpm run test:gui` covers three AppFrame cases for the layout swap (zero track, overlay toggle, wide-restore dropping `mobileOpen`), two more pinning grid item positions on both sides of the breakpoint, `mobile-header.client.spec.tsx` for the two surfaces (header controls, panel mounts wide, scrim dismissal, no duplicated New Session), two `computeColumns` cases for `'absent'`, and apply-level coverage of the dismissal effect and its teardown. Neither changed package reports an uncovered location.

Both regressions above were found in a real browser at a 390px viewport, not in jsdom: the grid tracks were correct in every unit assertion while the rendered columns sat one track off. `apps/web/tests/mobile-header.e2e.ts` covers the assembled result at that viewport.

Four `ui-settings-models` apply-spec failures are pre-existing and untouched here, reproduced on a stashed clean tree.

## Related

The user directed that this change ship English-only, so `translation-pairing` was removed from the `doc-sync` gate list and from the pinned id list in `run-gates.spec.ts`; the AGENTS.md documentation rule now names English as the source of truth. The lefthook hooks stay in place because they trigger only on staged `*.i18n.yaml` files, which this change does not modify. Existing `README.zh.md` files and `.i18n.yaml` records remain on disk, now unenforced and free to drift; re-recording them would have certified stale translations as consistent.
