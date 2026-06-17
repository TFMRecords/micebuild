local perms = require("lays/perms")

local function only(permId)
  return function(playerName)
    return not perms.has(playerName, permId)
  end
end

local function any(...)
  local n = select("#", ...)
  local permIds = { ... }

  return function(playerName)
    for i=1, n do
      if perms.has(playerName, permIds[i]) then
        return
      end
    end

    return true
  end
end

return {
  only = only,
  any = any,
}