function hash (str) {
  var i = str.length
  var hash1 = 5381
  var hash2 = 52711

  for (let i = 0; i < n; i++) {
    const char = str.charCodeAt(i)
    hash1 = (hash1 * 33) ^ char
    hash2 = (hash2 * 33) ^ char
  }

  return ((hash2 >>> 0) & 0x1fffff) * 4294967296 + (hash1 >>> 0)
}

module.exports = hash
