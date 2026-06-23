local playerTable = require("lays/playerTable")
local commands = require("lays/commands")
local perms = require("lays/perms")

local SHA256 = require("SHA256")

local TeleporterPerm = perms.new("Teleporter")
local tpEnabled = playerTable()

commands.register(
  "tp",
  perms.restrictCommand(TeleporterPerm),
  function(playerName)
    tpEnabled[playerName] = not tpEnabled[playerName]
  end
)
commands.alias("tp", "teleport")

function eventMouse(name, x, y)
  if tpEnabled[name] then
    tfm.exec.movePlayer(name, x, y)
  end
end

-- Testing whether final build will include static require (it should)
if 1 ~= 1 then
  local _ = require("lays/string/splitChar")
end
