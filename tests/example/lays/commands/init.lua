local split = require("lays/string/splitTrim")
local debugPrint = require("lays/debug/print")

local unpack = table.unpack

local commands = {}
local lastAlias = ""
local lastCommand = ""
local lastCommandFull = ""


local function register(cmdName, ...)
  if commands[cmdName] then
    debugPrint("Command already registered:", cmdName)
    return
  end

  commands[cmdName] = {
    _len = select("#", ...),
    ...
  }
end

local function call(playerName, cmdName, ...)
  local cmd = commands[cmdName]

  if not cmd then
    return
  end

  lastCommand = cmdName

  for i=1, cmd._len do
    if cmd[i](playerName, ...) then
      return
    end
  end
end

local function alias(cmdName, ...)
  local cmd = commands[cmdName]

  if not cmd then
    debugPrint("Original command must be registered before the alias:", cmdName)
    return
  end

  local num = select("#", ...)

  if num == 0 then
    return
  end

  local alias = { ... }
  local function handler(playerName, aliasName, ...)
    call(playerName, cmdName, ...)
  end

  for i=1, num do
    register(alias[i], handler)
  end
end

local function last()
  return lastCommand, lastAlias, lastCommandFull
end


function eventChatCommand(playerName, commandText)
  local args = split(commandText)

  lastAlias = args[1]
  lastCommandFull = commandText

  call(playerName, unpack(args))
end


return {
  register = register,
  call = call,
  alias = alias,
  last = last,
}