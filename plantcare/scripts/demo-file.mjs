/*
 * Writes dist/Demo household.plants.
 *
 * The app can build the demo in memory — the welcome screen's "look around"
 * does exactly that — so this file exists for the other two reasons a demo
 * needs to be a file. It is what somebody opens to prove that "Open an existing
 * file" works before they trust the app with a file of their own, and it is a
 * worked example of the format, which matters when the whole promise is that
 * the data is yours and readable without this app.
 *
 * Dated from the day the build runs, for the same reason the in-app demo is:
 * fixed dates make the demo look abandoned within a month.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { buildDemo, DEMO_FILE_NAME } = await import(resolve(root, 'src/app/data/demo.ts'))
const { serialiseStore, parseStore } = await import(resolve(root, 'src/app/data/schema.ts'))
const { today } = await import(resolve(root, 'src/app/calc/dates.ts'))

const VERSION = 'Plant Care 1.0'
const store = buildDemo(today(), VERSION)
const text = serialiseStore(store, VERSION)

/* Read it back through the same parser the app uses. A demo file that the app
   refuses to open is worse than no demo file, and it is the kind of thing that
   is only ever discovered by a buyer. */
const reread = parseStore(text)
if (reread.plants.length !== store.plants.length || reread.log.length !== store.log.length) {
  console.error('  the demo file does not survive a round trip through parseStore')
  process.exit(1)
}

mkdirSync(resolve(root, 'dist'), { recursive: true })
const out = resolve(root, 'dist', DEMO_FILE_NAME)
writeFileSync(out, text)

console.log(
  `  ok    dist/${DEMO_FILE_NAME}  ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB  ` +
    `${store.plants.length} plants, ${store.log.length} journal entries`
)
