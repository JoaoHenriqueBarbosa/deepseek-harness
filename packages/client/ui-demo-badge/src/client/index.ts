/**
 * Persistence-demonstration plugin, browser half: one `demo-badge` entry in
 * the conversation-owned `conversation.composer.dock` list slot, holding the
 * Chrome offline dinosaur game. The surface reads no session state and calls
 * no Remote — what it demonstrates is composition and durability: the game and
 * its high score return after a `dsh web` restart because the entry ships in
 * the web-app bundle instead of a dynamic Cordis package.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer.dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { DinoGame } from './DinoGame.tsx'
import { en, zh, type DemoBadgeKey } from './locales.ts'

export type { DemoBadgeKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The demonstration game's copy. */
    demoBadge: DemoBadgeKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'demoBadge'

/** Required services for the dock entry and its copy. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: the game entry in the composer dock.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-demo-badge: dictionaries')

  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'demo-badge',
    order: 100,
    locale: NS,
  }, DinoGame))
}
