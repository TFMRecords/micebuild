return (function(
  unpack, table_concat,
  byte, char, string_rep, sub, gsub,
  format, string_match, floor, math_min, math_max,
  tonumber, AND, XOR, SHR, ROL, ROR, BNOT
)
  -- returns string of 8 lowercase hexadecimal digits
  local function HEX (x)
    return format("%08x", x % 4294967296)
  end
  
  -- SHA2 magic numbers
  local sha2_K_hi = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  }
  local common_W = {}    -- temporary table shared between all calculations (to avoid creating new temporary table every time)
  
  -- Inner loop functions
  -- implementation for Lua 5.1/5.2 (with or without bitwise library available)
  local function sha256_feed_64(H, str, offs, size)
    -- offs >= 0, size >= 0, size is multiple of 64
    local W, K = common_W, sha2_K_hi
    local h1, h2, h3, h4, h5, h6, h7, h8 = H[1], H[2], H[3], H[4], H[5], H[6], H[7], H[8]
    for pos = offs, offs + size - 1, 64 do
      for j = 1, 16 do
        pos = pos + 4
        local a, b, c, d = byte(str, pos - 3, pos)
        W[j] = ((a * 256 + b) * 256 + c) * 256 + d
      end
      for j = 17, 64 do
        local a, b = W[j-15], W[j-2]
        W[j] = XOR(ROR(a, 7), ROL(a, 14), SHR(a, 3)) + XOR(ROL(b, 15), ROL(b, 13), SHR(b, 10)) + W[j-7] + W[j-16]
      end
      local a, b, c, d, e, f, g, h = h1, h2, h3, h4, h5, h6, h7, h8
      for j = 1, 64 do
        local z = XOR(ROR(e, 6), ROR(e, 11), ROL(e, 7)) + AND(e, f) + AND(BNOT(e), g) + h + K[j] + W[j]
        h = g
        g = f
        f = e
        e = z + d
        d = c
        c = b
        b = a
        a = z + AND(d, c) + AND(a, XOR(d, c)) + XOR(ROR(a, 2), ROR(a, 13), ROL(a, 10))
      end
      h1, h2, h3, h4 = (a + h1) % 4294967296, (b + h2) % 4294967296, (c + h3) % 4294967296, (d + h4) % 4294967296
      h5, h6, h7, h8 = (e + h5) % 4294967296, (f + h6) % 4294967296, (g + h7) % 4294967296, (h + h8) % 4294967296
    end
    H[1], H[2], H[3], H[4], H[5], H[6], H[7], H[8] = h1, h2, h3, h4, h5, h6, h7, h8
  end

  local function sha256Raw(message)
    -- Create an instance (private objects for current calculation)
    local H, length = {0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19}, #message
    local size_tail = length % 64
    sha256_feed_64(H, message, 0, length - size_tail)
    local tail = sub(message, length + 1 - size_tail)
    local final_blocks = {tail, "\128", string_rep("\0", (-9 - length) % 64 + 1)}
    -- Assuming user data length is shorter than (2^53)-9 bytes
    -- Anyway, it looks very unrealistic that someone would spend more than a year of calculations to process 2^53 bytes of data by using this Lua script :-)
    -- 2^53 bytes = 2^56 bits, so "bit-counter" fits in 7 bytes
    length = length * (8 / 256^7)  -- convert "byte-counter" to "bit-counter" and move decimal point to the left
    for j = 4, 10 do
      length = length % 1 * 256
      final_blocks[j] = char(floor(length))
    end
    final_blocks = table_concat(final_blocks)
    sha256_feed_64(H, final_blocks, 0, #final_blocks)
    return H
  end

  local function sha256(message)
    local H = sha256Raw(message)
    for j = 1, 8 do
      H[j] = HEX(H[j])
    end
    return table_concat(H, "", 1, 8)
  end
  
  local function hex2bin(hex_string)
    return (gsub(hex_string, "%x%x",
      function (hh)
        return char(tonumber(hh, 16))
      end
    ))
  end

  local function pad_and_xor(str, result_length, byte_for_xor)
    return gsub(str, ".", function(c)
        return char(XOR(byte(c), byte_for_xor))
      end
    )..string_rep(char(byte_for_xor), result_length - #str)
  end

  local function hmacCached(key)
    if #key > 64 then
      key = hex2bin(sha256(key))
    end
    local xor36, xor5C = pad_and_xor(key, 64, 0x36), pad_and_xor(key, 64, 0x5C)
    local function cached(message)
      return sha256(xor5C..hex2bin(sha256(xor36..message)))
    end
    return cached
  end

  assert(
    sha256(
      "a94e7bcfcbed3c846d491d4f47c948e53a23908d480248b3ffe9e126e83ea865"
    ) == "00e7832a14acefb7e9f386b02190a92d67090423a6825e95a018d8e9467fb517",
    "SHA-256 function is wrong"
  )

  local sha = {
    -- SHA2 hash functions:
    sha256     = sha256, -- SHA-256
    -- misc utilities:
    hmacCached = hmacCached,
    hex2bin    = hex2bin,    -- converts hexadecimal representation to binary string
  }

  return sha
end)(
  table.unpack or unpack, table.concat,
  string.byte, string.char, string.rep, string.sub, string.gsub,
  string.format, string.match, math.floor, math.min, math.max, tonumber,
  bit32.band, bit32.bxor, bit32.rshift, bit32.lrotate, bit32.rrotate,
  bit32.bnot
);
