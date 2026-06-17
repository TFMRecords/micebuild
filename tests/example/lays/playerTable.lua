local room = tfm.get.room


local tablesN = 0
local tables = {}
local defaults = {}


local function newPlayerTable(defaultValue)
  local retTbl = {}

  tablesN = 1 + tablesN
  tables[tablesN] = retTbl
  defaults[tablesN] = defaultValue

  if defaultValue ~= nil then
    for playerName in next, room.playerList do
      retTbl[playerName] = defaultValue
    end
  end

  return retTbl
end


function eventNewPlayer(playerName)
  for i=1, tablesN do
    tables[i][playerName] = defaults[i]
  end
end

function eventPlayerLeft(playerName)
  for i=1, tablesN do
    tables[i][playerName] = nil
  end
end


return newPlayerTable