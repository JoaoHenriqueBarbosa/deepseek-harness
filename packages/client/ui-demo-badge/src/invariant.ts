/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-demo-badge`.
 * @module @deepseek-ai/dsh-client-ui-demo-badge/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-demo-badge'

/** Cordis companion plugin name. */
export const name = 'client-ui-demo-badge-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a single composer-dock registration rendering static
 * copy, whose disposal is proven by the HMR-safety spec — the plugin owns no
 * store, reads no session data, emits no cordis events, and holds no
 * cross-plugin mutable state.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
