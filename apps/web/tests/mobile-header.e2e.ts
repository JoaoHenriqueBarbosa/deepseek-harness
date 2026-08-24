// Keyless browser regression for the mobile header layout (viewport < 720px).
// The sidebar leaves the grid for a header, and the details column must not
// occupy width or paint its panel over the conversation at that width — the
// mobile report was a permanently visible "Details" empty state with no way
// to dismiss it.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  fixtureUserPrompts, launchWebScaffold, seedSession, watchConsole, webSnapshotMode,
  type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, saveFailureShot } from './support.ts'

const FIXTURE = fileURLToPath(new URL('./snapshots/lifecycle-chrome/session.jsonl', import.meta.url))
const SEED_FIXTURE = fileURLToPath(new URL('./snapshots/seeded-history/seed.jsonl', import.meta.url))
const PROMPT = 'Reply with the single word LIGHTHOUSE and stop.'
const MODE = webSnapshotMode()

/** AppFrame is the only product element with an inline grid track template. */
function appFrame(page: Page) {
  return page.locator('[style*="grid-template-columns"]').first()
}

/** Resolved AppFrame grid tracks in CSS pixels. */
async function tracks(page: Page): Promise<number[]> {
  return await appFrame(page).evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').map(Number.parseFloat))
}

describe.skipIf(MODE === 'record')('web e2e: mobile header layout', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    const fixture = await readFile(FIXTURE, 'utf8')
    expect(fixtureUserPrompts(fixture)).toEqual([PROMPT])
    scaffold = await launchWebScaffold({ replayFixture: FIXTURE, paceMs: 5 })
    await seedSession(scaffold, await readFile(SEED_FIXTURE, 'utf8'), 'mobile-header-seed')
    browser = await chromium.launch()
    // A common phone viewport, well below the 720px mobile breakpoint.
    page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' })
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await appFrame(page).waitFor({ timeout: 30_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('gives the whole width to the conversation and never shows the details panel', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-mobile-header'))

    // The sidebar owns no track, and details stays closed.
    await expect.poll(() => tracks(page), { timeout: 10_000 }).toEqual([0, 390, 0])
    expect(await appFrame(page).getAttribute('data-mobile')).toBe('true')

    // The reported symptom: the details empty state must not be on screen.
    expect(await page.getByText('Details', { exact: true }).isVisible()).toBe(false)
    expect(await page.getByText('Click a tool row in the message flow to view its details').isVisible()).toBe(false)

    // The composer must be reachable, which was the original complaint.
    const input = page.locator('textarea').first()
    await expect.poll(async () => (await input.boundingBox())?.width ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(200)

    const settled = scaffold.whenTurnSettled()
    await input.fill(PROMPT)
    await input.press('Enter')
    await settled
    await page.getByText('LIGHTHOUSE', { exact: true }).waitFor({ timeout: 15_000 })

    // A completed turn with tool rows must not have opened the panel.
    await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual([0, 390, 0])
    expect(await page.getByText('Details', { exact: true }).isVisible()).toBe(false)
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  }, 120_000)
})
