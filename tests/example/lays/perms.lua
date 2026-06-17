local playerTable = require("lays/playerTable")

local band = bit32.band

local lastPermId = 1
local perms = {}

-- TODO make this permanent
-- pre-populate by id/name?
local playerPerms = playerTable(0)


local function new(permName)
  local permId = lastPermId
  lastPermId = permId * 2
  perms[permId] = permName
  return permId
end

local function give(playerName, permId)
  playerPerms[playerName] = (playerPerms[playerName] or 0) + permId
end

local function has(playerName, permId)
  return band(playerPerms[playerName], permId) == permId
end


local loaderPerm = new("Script Loader")

local function getScriptLoader()
  local _, err = pcall(0)
  local name = string.match(err, "^(.-)%.")
  return name
end

local loader = getScriptLoader()
if loader then
  give(loader, loaderPerm)
end


local function restrictCommand(permId)
  return function(playerName)
    return not has(playerName, permId)
  end
end


return {
  new = new,
  give = give,
  has = has,

  loaderPerm = loaderPerm,
  restrictCommand = restrictCommand,
}