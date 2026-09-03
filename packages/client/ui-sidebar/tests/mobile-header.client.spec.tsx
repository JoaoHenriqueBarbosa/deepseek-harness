// @vitest-environment jsdom
/**
 * SidebarRoot under the mobile header layout: below the frame's mobile
 * breakpoint the shell owns no column, so it renders a header row in place
 * and puts the browsing panel behind a scrim. The assertions here are the
 * user-visible consequences of that swap — the rail and the resize affordance
 * are gone, the header controls stay reachable, and the panel is transient.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type {
  SidebarFooterActionOwnerProps, SidebarRootComponentProps, SidebarSectionOwnerProps,
  SidebarSettingsOwnerProps,
} from '../src/client/contract/slots.ts'
import { SidebarRoot } from '../src/client/SidebarRoot.tsx'
import { en } from '../src/client/locales.ts'

const t: SidebarRootComponentProps['t'] = key => (en as Record<string, string>)[key] ?? key

afterEach(() => { cleanup() })

/** The shell reads no global hook; the props share still carries them. */
const neverHook = (() => { throw new Error('shell must not read global hooks') }) as never
type AttentionSnapshot = Parameters<Parameters<SidebarRootComponentProps['useSessionPendingInteraction']>[0]>[0]
const noAttention: AttentionSnapshot = new Map()
const useSessionPendingInteraction: SidebarRootComponentProps['useSessionPendingInteraction'] = selector => selector(noAttention)

function mountMobile({ surface = 'header' as 'header' | 'panel' } = {}) {
  const startSession = vi.fn()
  const toggleSidebar = vi.fn()
  const closeMobileSidebar = vi.fn()
  let regionOwner: SidebarSectionOwnerProps | undefined
  const view = render(
    <SidebarRoot
      collapsed={surface !== 'panel'} width={0}
      mobile mobileOpen={surface === 'panel'} surface={surface}
      useSessions={neverHook} useSessionPendingInteraction={useSessionPendingInteraction} useWorkspaces={neverHook}
      startSession={startSession} toggleSidebar={toggleSidebar}
      closeMobileSidebar={closeMobileSidebar} t={t}
      renderSlot={((
        key: string,
        owner: SidebarFooterActionOwnerProps | SidebarSectionOwnerProps | SidebarSettingsOwnerProps,
      ) => {
        if (key === 'sidebar.brand.mark') return <span data-testid="brand-mark" />
        if (key === 'sidebar.brand.name') return <span data-testid="brand-name">DSH</span>
        if (key === 'sidebar.settings') return <div data-testid="settings-seat" />
        if (key === 'sidebar.footer.action') return <div data-testid="footer-action-seat" />
        regionOwner = owner as SidebarSectionOwnerProps
        return <div data-testid="region" data-wide={owner.wide} />
      }) as SidebarRootComponentProps['renderSlot']}
    />,
  )
  return { view, startSession, toggleSidebar, closeMobileSidebar, region: () => regionOwner }
}

describe('SidebarRoot — mobile header', () => {
  it('renders the header controls and no browsing region while closed', () => {
    const { startSession, toggleSidebar } = mountMobile()
    // The whole point of the layout: nothing of the sidebar occupies width
    // until it is asked for, so the region is simply not mounted.
    expect(screen.queryByTestId('region')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: en['session.new.label'] }))
    expect(startSession).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: en['toggle.open'] }))
    expect(toggleSidebar).toHaveBeenCalledOnce()
  })

  it('mounts the browsing region wide once the panel opens', () => {
    const { region } = mountMobile({ surface: 'panel' })
    expect(screen.getByTestId('region')).toBeTruthy()
    // The panel is never a rail: its occupants always render wide.
    expect(region()!.wide).toBe(true)
    expect(screen.getByTestId('settings-seat')).toBeTruthy()
  })

  it('dismisses the panel from the scrim', () => {
    const { closeMobileSidebar } = mountMobile({ surface: 'panel' })
    fireEvent.click(screen.getByRole('button', { name: en['toggle.collapse'] }))
    expect(closeMobileSidebar).toHaveBeenCalledOnce()
  })

  it('does not duplicate the header controls inside the panel', () => {
    // The header carries New Session; the panel surface must not repeat it,
    // or the same action would answer to two identical accessible names while
    // both surfaces are on screen together.
    mountMobile({ surface: 'panel' })
    expect(screen.queryByRole('button', { name: en['session.new.label'] })).toBeNull()
  })

  it('renders the scrim and panel only on the panel surface', () => {
    const header = mountMobile({ surface: 'header' })
    expect(header.view.container.querySelector('header')).not.toBeNull()
    // The dismiss affordance belongs to the overlay surface, not the header.
    expect(screen.queryByRole('button', { name: en['toggle.collapse'] })).toBeNull()
    cleanup()
    mountMobile({ surface: 'panel' })
    expect(screen.getByRole('button', { name: en['toggle.collapse'] })).toBeTruthy()
    expect(screen.getByTestId('region')).toBeTruthy()
  })
})
