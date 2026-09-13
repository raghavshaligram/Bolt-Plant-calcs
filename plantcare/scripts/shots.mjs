/*
 * Screenshots of the built file, not of a dev server.
 *
 * It matters that this drives dist/PlantCare.html over file://, because that is
 * exactly how a buyer opens it — double-clicked, no server, no build step. A
 * screenshot of `npm run dev` would look identical and would prove nothing
 * about the artefact that actually ships.
 *
 * Each shot navigates and clicks its way there rather than being set up through
 * injected state, so a run that produces ten images is also a run that proved
 * the app can be operated from a cold start.
 */
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = pathToFileURL(resolve(root, 'dist/PlantCare.html')).href
const OUT = resolve(root, 'shots')

const EXECUTABLE = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(
  (p) => {
    try {
      readdirSync(dirname(p))
      return true
    } catch {
      return false
    }
  }
)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXECUTABLE })
const shots = []

async function shoot(page, name, opts = {}) {
  await page.waitForTimeout(220)
  const path = resolve(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: opts.full ?? false })
  shots.push(name)
  console.log(`  ${name}.png`)
}

// ---- desktop ----------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(FILE)
  await page.waitForSelector('.masthead')
  await shoot(page, '01-welcome')

  await page.getByRole('button', { name: /look around the demo/i }).click()
  await page.waitForSelector('.nav')
  await shoot(page, '02-today', { full: true })

  // The reasoning panel — the thing that makes the schedule trustworthy.
  const why = page.getByRole('button', { name: /^Why is .* due this often/i }).first()
  await why.click()
  await shoot(page, '03-why', { full: true })
  await why.click()

  await page.getByRole('button', { name: 'My plants' }).click()
  await page.waitForSelector('.plant-card')
  await shoot(page, '04-plants')

  await page.locator('.plant-card').first().click()
  await page.waitForSelector('.care')
  await shoot(page, '05-plant-detail', { full: true })

  await page.getByRole('button', { name: 'Plants A–Z' }).click()
  await page.waitForSelector('.species-row')
  await shoot(page, '06-library')

  await page.getByPlaceholder(/Search \d+ plants/).fill('fern')
  await page.waitForTimeout(150)
  await page.locator('.species-row').first().click()
  await page.waitForSelector('.kv')
  await shoot(page, '07-species', { full: true })

  await page.getByRole('button', { name: 'Diagnose' }).click()
  await page.waitForSelector('.species-row')
  await page.locator('.species-row').first().click()
  await page.waitForSelector('.card .head h3')
  await page.locator('.species-row').first().click()
  await page.waitForTimeout(150)
  await shoot(page, '08-diagnose', { full: true })

  await page.getByRole('button', { name: 'Tools' }).click()
  await page.waitForSelector('.btn')
  await shoot(page, '09-tools-light', { full: true })

  /* No camera in a headless browser, which is exactly the degraded state worth
     photographing — and clicking a category proves the verdict path renders
     without one. */
  await page.getByRole('button', { name: 'Bright indirect' }).click()
  await page.waitForTimeout(200)
  await shoot(page, '09b-light-reading', { full: true })

  await page.getByRole('button', { name: 'Measure a pot' }).click()
  await page.waitForTimeout(200)
  await shoot(page, '10-tools-measure', { full: true })

  await page.getByRole('button', { name: 'Zone & frost dates' }).click()
  await page.waitForSelector('.kv')
  await shoot(page, '11-tools-zone', { full: true })

  await page.getByRole('button', { name: 'Companion planting' }).click()
  await page.waitForSelector('table')
  await shoot(page, '12-tools-companion', { full: true })

  await page.getByRole('button', { name: 'Live weather' }).click()
  await page.waitForSelector('#wx-url')
  await shoot(page, '13-tools-weather', { full: true })

  await page.getByRole('button', { name: 'Journal' }).click()
  await page.waitForSelector('textarea')
  await shoot(page, '14-journal', { full: true })

  await page.getByRole('button', { name: 'My plants' }).click()
  await page.getByRole('button', { name: /add a plant/i }).click()
  await page.waitForSelector('.species-row')
  await shoot(page, '15-add-plant')

  if (errors.length) {
    console.error('\n  The page logged errors while being driven:\n' + errors.map((e) => '    ' + e).join('\n'))
    await browser.close()
    process.exit(1)
  }
  await page.close()
}

// ---- phone ------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await page.goto(FILE)
  await page.getByRole('button', { name: /look around the demo/i }).click()
  await page.waitForSelector('.nav')
  await shoot(page, '16-phone-today', { full: true })

  await page.locator('.nav button').nth(1).click()
  await page.waitForSelector('.plant-card')
  await shoot(page, '17-phone-plants', { full: true })

  await page.locator('.plant-card').first().click()
  await page.waitForSelector('.care')
  await shoot(page, '18-phone-detail', { full: true })
  await page.close()
}

await browser.close()
console.log(`\n  ${shots.length} screenshots in shots/\n`)
