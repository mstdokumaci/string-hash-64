# string-hash-64

An improved version of djb2. Generates 64 bit integer keys. Returns a number between 0 and 18446744073709552000.

Repository includes test for hashing 50 million strings with no collisions.

Performs as fast as djb2, only the generated hashes will consume twice memory in size.
