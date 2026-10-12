function hash (str) {
  let hash1 = 5381
  let hash2 = 52711

  for (let i = 0, n = str.length; i < n; i++) {
    const char = str.charCodeAt(i)
    hash1 = (hash1 * 33) ^ char
    hash2 = (hash2 * 65599) ^ char
  }

  return (hash2 >>> 11) * 4294967296 + (hash1 >>> 0)
}

module.exports = hash
