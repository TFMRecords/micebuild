local gmatch = string.gmatch

local function splitChar(str, sepChar)
  local ret = {}
  local n = 0

  for part in gmatch(str, "([^" .. sep .. "]*)") do
    n = 1 + n
    ret[n] = part
  end

  return ret, n
end

return splitChar