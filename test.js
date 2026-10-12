const { test } = require('node:test')
const assert = require('node:assert')
const hash = require('./')

const vectors = [
  ['', 107374187781],
  ['a', 7251506818627012],
  ['abc', 7896868797756037],
  ['hello', 6000404498017767],
  ['hello world', 5900653583291205],
  ['The quick brown fox jumps over the lazy dog', 5569677996177418],
  ['🚀', 1553519741042200],
  ['x'.repeat(1000), 1522355875202309]
]

test('known vectors', () => {
  for (const [input, expected] of vectors) {
    assert.strictEqual(hash(input), expected, JSON.stringify(input))
  }
})

test('deterministic', () => {
  assert.strictEqual(hash('hello world'), hash('hello world'))
  assert.strictEqual(hash('x'.repeat(1000)), hash('x'.repeat(1000)))
})

test('returns safe non-negative integers', () => {
  for (const input of ['', 'a', 'x'.repeat(1000), '🚀 unicode', '0', '18446744073709551615']) {
    const h = hash(input)
    assert.ok(Number.isSafeInteger(h), `${JSON.stringify(input)} -> ${h}`)
    assert.ok(h >= 0)
  }
})

test('no collisions in first 1M sequential integers', () => {
  const n = 1e6
  const hashes = new Float64Array(n)
  for (let i = 0; i < n; i++) hashes[i] = hash(String(i))
  hashes.sort()
  let collisions = 0
  for (let i = 1; i < n; i++) if (hashes[i] === hashes[i - 1]) collisions++
  assert.strictEqual(collisions, 0)
})
