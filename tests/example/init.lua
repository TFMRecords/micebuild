local playerTable = require("lays/playerTable")
local commands = require("lays/commands")
local perms = require("lays/perms")


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
  if tpEnabled[playerName] then
    tfm.exec.movePlayer(name, x, y)
  end
end
