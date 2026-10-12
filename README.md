# string-hash-64

[![npm version](https://badge.fury.io/js/string-hash-64.svg)](https://badge.fury.io/js/string-hash-64)
[![test](https://github.com/mstdokumaci/string-hash-64/actions/workflows/test.yml/badge.svg)](https://github.com/mstdokumaci/string-hash-64/actions/workflows/test.yml)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

An improved version of djb2: two djb2-style lanes with different strides (33 and 65599) combined into a 53-bit integer hash that always fits in `Number.MAX_SAFE_INTEGER`. Returns a number between 0 and 9007199254740991.

```js
const hash = require('string-hash-64')

hash('hello') // 6000404498017767
```

## Collisions, measured against djb2

**Zero collisions among the first 300 million sequential integers** (`"0"` … `"299999999"`) — djb2 already has 12.6 million duplicate entries in that same batch.

Run `npm run test:collisions` to reproduce (it grows sequential batches until the first collision; needs ~4GB of RAM and a few minutes).

| | string-hash-64 | djb2 | djb2 (reverse loop) |
| --- | ---: | ---: | ---: |
| first collision among sequential integers | **318,937,570** | 1,626,086 | 5,004,826 |
| duplicate entries in a batch of 300M sequential integers | **0** | 12,608,182 | 10,963,171 |
| duplicate entries among 10M random 12-character keys | **0** | 11,896 | 11,728 |

First collision: `hash("103939545") === hash("318937570")`.

## Performance

Throughput is on par with djb2 — the two lanes overlap in the JIT'ed loop, so the extra multiply per character does not show up in practice (medians from the same run):

| ns per key | 8 chars | 12 chars | 32 chars | 64 chars |
| --- | ---: | ---: | ---: | ---: |
| string-hash-64 | 24.6 | 32.5 | 107.5 | 197.8 |
| djb2 | 26.2 | 33.5 | 111.1 | 200.9 |

Your machine will differ; the comparison script prints its own table.

## Breaking change in 2.0.0

Hash values differ from 1.x. Rehash anything you persisted. The API is unchanged: `hash(string)` returns a number.

## Development

- `npm test` — linter + unit tests
- `npm run test:collisions` — the full comparison against djb2 above

## License

MIT
