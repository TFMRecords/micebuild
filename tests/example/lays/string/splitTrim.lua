local gmatch = string.gmatch

local function splitTrim(str)
  local ret = {}
  local n = 0

  for part in gmatch(str, "%S+") do
    n = 1 + n
    ret[n] = part
  end

  return ret, n
end

return splitTrim