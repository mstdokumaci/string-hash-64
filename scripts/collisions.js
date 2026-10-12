const hash = require('../')

function djb2 (str) {
  let h = 5381
  for (let i = 0, n = str.length; i < n; i++) h = (h * 33) ^ str.charCodeAt(i)
  return h >>> 0
}

function djb2Reverse (str) {
  let h = 5381
  let i = str.length
  while (i) h = (h * 33) ^ str.charCodeAt(--i)
  return h >>> 0
}

const mb = n => Math.round(n / 1048576) + 'MB'

function scanSequential (fn, n) {
  const hashes = new Float64Array(n)
  for (let i = 0; i < n; i++) hashes[i] = fn(String(i))
  hashes.sort()
  const dupValues = new Set()
  let duplicates = 0
  for (let i = 1; i < n; i++) {
    if (hashes[i] === hashes[i - 1]) {
      dupValues.add(hashes[i])
      duplicates++
    }
  }
  return { duplicates, dupValues }
}

function exactBoundary (fn, n, dupValues) {
  const firstSeen = new Map()
  const resolved = new Set()
  let boundary = Infinity
  let pair = ''
  for (let i = 0; i < n && resolved.size < dupValues.size; i++) {
    const h = fn(String(i))
    if (!dupValues.has(h) || resolved.has(h)) continue
    const first = firstSeen.get(h)
    if (first === undefined) {
      firstSeen.set(h, i)
    } else {
      if (i < boundary) {
        boundary = i
        pair = `String(${first}) / String(${i})`
      }
      resolved.add(h)
    }
  }
  return { boundary, pair }
}

function boundarySearch (name, fn, start, max) {
  console.log(`\n-- sequential integers, growing batches: ${name} --`)
  let clean = start
  let dupValues = null
  let colliding = -1
  for (let n = start * 2; n <= max; n *= 2) {
    const t = Date.now()
    const r = scanSequential(fn, n)
    console.log(`  ${(n / 1e6).toFixed(0)}M: duplicate entries = ${r.duplicates} (${Date.now() - t}ms, rss ${mb(process.memoryUsage().rss)})`)
    if (r.duplicates > 0) {
      colliding = n
      dupValues = r.dupValues
      break
    }
    clean = n
  }
  if (colliding < 0) {
    console.log(`  no collisions up to ${(clean / 1e6).toFixed(0)}M`)
  } else if (dupValues.size > 3e6) {
    console.log(`  collisions found at ${(colliding / 1e6).toFixed(0)}M (too many duplicate values for an exact pass)`)
  } else {
    const { boundary, pair } = exactBoundary(fn, colliding, dupValues)
    console.log(`  first collision at ${boundary}: ${pair}`)
    console.log(`  collision-free prefix: ${boundary} sequential integers`)
  }
}

function randomKeys (count, length) {
  let seed = 123456789
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0)
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const keys = new Array(count)
  for (let i = 0; i < count; i++) {
    let key = ''
    for (let j = 0; j < length; j++) key += chars[rnd() % 62]
    keys[i] = key
  }
  return keys
}

function countDuplicates (fn, keys) {
  const n = keys.length
  const hashes = new Float64Array(n)
  for (let i = 0; i < n; i++) hashes[i] = fn(keys[i])
  hashes.sort()
  let duplicates = 0
  for (let i = 1; i < n; i++) if (hashes[i] === hashes[i - 1]) duplicates++
  return duplicates
}

function bench (fn, arr, reps) {
  let sink = 0
  const t0 = process.hrtime.bigint()
  for (let r = 0; r < reps; r++) for (let i = 0; i < arr.length; i++) sink = fn(arr[i])
  const t1 = process.hrtime.bigint()
  if (sink === 12345) throw new Error('sink')
  return Number(t1 - t0) / reps / arr.length
}

function medians (results) {
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1]
  const table = {}
  for (const [name, row] of Object.entries(results)) {
    table[name] = {}
    for (const len of Object.keys(row)) table[name][len] = med(row[len]).toFixed(1)
  }
  return table
}

function chiSquare (fn, keys, mask) {
  const buckets = new Uint32Array(mask + 1)
  for (let i = 0; i < keys.length; i++) buckets[fn(keys[i]) & mask]++
  const expected = keys.length / (mask + 1)
  let chi = 0
  for (let b = 0; b <= mask; b++) {
    const d = buckets[b] - expected
    chi += d * d / expected
  }
  return chi.toFixed(0)
}

const START = 10e6
const MAX = 320e6
const ROUNDS = 15
const LENGTHS = [8, 12, 32, 64]

console.log('string-hash-64 collision & speed report')
console.log('node', process.version, '|', (require('os').totalmem() / 1073741824).toFixed(1) + 'GB RAM')

console.log('\n-- throughput, median ns/key (warmup + ' + ROUNDS + ' interleaved rounds) --')
const benchData = {}
for (const len of LENGTHS) benchData[len] = randomKeys(len <= 12 ? 1e6 : 5e5, len)
const benchImpls = [['string-hash-64', hash], ['djb2', djb2]]
for (const [, fn] of benchImpls) for (const len of LENGTHS) bench(fn, benchData[len], 2)
const results = {}
for (const [name] of benchImpls) results[name] = {}
for (let r = 0; r < ROUNDS; r++) {
  const ordered = r % 2 ? benchImpls.slice().reverse() : benchImpls
  for (const [name, fn] of ordered) {
    for (const len of LENGTHS) (results[name][len] = results[name][len] || []).push(bench(fn, benchData[len], 1))
  }
}
const table = medians(results)
const pad = (v, w) => String(v).padStart(w)
console.log('  impl'.padEnd(18) + LENGTHS.map(l => pad('len' + l, 10)).join(''))
for (const [name] of benchImpls) console.log('  ' + name.padEnd(16) + LENGTHS.map(l => pad(table[name][l], 10)).join(''))

for (const [name, fn] of [['string-hash-64', hash], ['djb2', djb2], ['djb2 (reverse)', djb2Reverse]]) {
  boundarySearch(name, fn, START, MAX)
}

console.log('\n-- 300M sequential integers: duplicate entries in batch --')
for (const [name, fn] of [['string-hash-64', hash], ['djb2', djb2], ['djb2 (reverse)', djb2Reverse]]) {
  const t = Date.now()
  const r = scanSequential(fn, 300e6)
  console.log(`  ${name}: ${r.duplicates} (${Date.now() - t}ms)`)
}

console.log('\n-- 10M random 12-char keys: duplicate entries --')
const keys = randomKeys(10e6, 12)
for (const [name, fn] of [['string-hash-64', hash], ['djb2', djb2], ['djb2 (reverse)', djb2Reverse]]) {
  const t = Date.now()
  console.log(`  ${name}: ${countDuplicates(fn, keys)} (${Date.now() - t}ms)`)
}

console.log('\n-- bucket chi-square, low bits (context; ideal ~255 / ~1023) --')
const seqKeys = new Array(1e6)
for (let i = 0; i < seqKeys.length; i++) seqKeys[i] = String(i)
console.log('  impl'.padEnd(18) + ['rand&255', 'rand&1023', 'seq&255', 'seq&1023'].map(h => h.padStart(10)).join(''))
for (const [name, fn] of [['string-hash-64', hash], ['djb2', djb2]]) {
  const row = [256, 1024].map(m => chiSquare(fn, keys.slice(0, 1e6), m - 1)).concat([256, 1024].map(m => chiSquare(fn, seqKeys, m - 1)))
  console.log('  ' + name.padEnd(16) + row.map(v => v.padStart(10)).join(''))
}
