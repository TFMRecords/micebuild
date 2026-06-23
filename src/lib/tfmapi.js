export default function() {
  return `do
  package.preload.bit32 = function ()     --{

    -- no built-in 'bit32' library: implement it using bitwise operators

    local bit = {}

    local powers = {}
    local p = 1
    for i = 0, 32 do
      powers[i] = p
      p = p * 2
    end

    local function to32 (x)
      x = tonumber(x) or 0
      if x ~= x or x == math.huge or x == -math.huge then
        return 0
      end
      return math.floor(x % 4294967296)
    end

    local function toint (x)
      x = tonumber(x) or 0
      if x ~= x or x == math.huge or x == -math.huge then
        return 0
      end
      return math.floor(x)
    end

    local function band2(a, b)
      local res = 0
      local shift = 1
      for i = 1, 32 do
        local a_bit = a % 2
        local b_bit = b % 2
        if a_bit == 1 and b_bit == 1 then
          res = res + shift
        end
        a = math.floor(a / 2)
        b = math.floor(b / 2)
        shift = shift * 2
      end
      return res
    end

    local function bor2(a, b)
      local res = 0
      local shift = 1
      for i = 1, 32 do
        local a_bit = a % 2
        local b_bit = b % 2
        if a_bit == 1 or b_bit == 1 then
          res = res + shift
        end
        a = math.floor(a / 2)
        b = math.floor(b / 2)
        shift = shift * 2
      end
      return res
    end

    local function bxor2(a, b)
      local res = 0
      local shift = 1
      for i = 1, 32 do
        local a_bit = a % 2
        local b_bit = b % 2
        if a_bit ~= b_bit then
          res = res + shift
        end
        a = math.floor(a / 2)
        b = math.floor(b / 2)
        shift = shift * 2
      end
      return res
    end

    function bit.bnot (a)
      return 4294967295 - to32(a)
    end

    function bit.band (x, y, z, ...)
      if y == nil then
        if x == nil then
          return 4294967295
        else
          return to32(x)
        end
      elseif z == nil then
        return band2(to32(x), to32(y))
      else
        local res = band2(to32(x), to32(y))
        res = band2(res, to32(z))
        local arg = {...}
        for i = 1, #arg do
          res = band2(res, to32(arg[i]))
        end
        return res
      end
    end

    function bit.bor (x, y, z, ...)
      if y == nil then
        if x == nil then
          return 0
        else
          return to32(x)
        end
      elseif z == nil then
        return bor2(to32(x), to32(y))
      else
        local res = bor2(to32(x), to32(y))
        res = bor2(res, to32(z))
        local arg = {...}
        for i = 1, #arg do
          res = bor2(res, to32(arg[i]))
        end
        return res
      end
    end

    function bit.bxor (x, y, z, ...)
      if y == nil then
        if x == nil then
          return 0
        else
          return to32(x)
        end
      elseif z == nil then
        return bxor2(to32(x), to32(y))
      else
        local res = bxor2(to32(x), to32(y))
        res = bxor2(res, to32(z))
        local arg = {...}
        for i = 1, #arg do
          res = bxor2(res, to32(arg[i]))
        end
        return res
      end
    end

    function bit.btest (...)
      return bit.band(...) ~= 0
    end

    function bit.lshift (a, b)
      b = toint(b)
      if b < 0 then
        return bit.rshift(a, -b)
      end
      if b >= 32 then
        return 0
      end
      return math.floor(to32(a) * powers[b]) % 4294967296
    end

    function bit.rshift (a, b)
      b = toint(b)
      if b < 0 then
        return bit.lshift(a, -b)
      end
      if b >= 32 then
        return 0
      end
      return math.floor(to32(a) / powers[b])
    end

    function bit.arshift (a, b)
      b = toint(b)
      if b < 0 then
        return bit.lshift(a, -b)
      end
      a = to32(a)
      if b >= 32 then
        if a >= 2147483648 then
          return 4294967295
        else
          return 0
        end
      end
      local shifted = math.floor(a / powers[b])
      if a >= 2147483648 then
        local fill = (powers[b] - 1) * powers[32 - b]
        return shifted + fill
      else
        return shifted
      end
    end

    function bit.lrotate (a ,b)
      b = toint(b) % 32
      if b == 0 then
        return to32(a)
      end
      a = to32(a)
      local shifted_l = (a * powers[b]) % 4294967296
      local shifted_r = math.floor(a / powers[32 - b])
      return (shifted_l + shifted_r) % 4294967296
    end

    function bit.rrotate (a, b)
      return bit.lrotate(a, -toint(b))
    end

    local function checkfield (f, w)
      f = toint(f)
      w = toint(w or 1)
      assert(f >= 0, "field cannot be negative")
      assert(w > 0, "width must be positive")
      assert(f + w <= 32, "trying to access non-existent bits")
      return f, w
    end

    function bit.extract (a, f, w)
      local f, w = checkfield(f, w)
      local shifted = math.floor(to32(a) / powers[f])
      return shifted % powers[w]
    end

    function bit.replace (a, v, f, w)
      local f, w = checkfield(f, w)
      a = to32(a)
      v = to32(v) % powers[w]
      local low_mask = powers[f]
      local high_mask = powers[f + w]
      local low_part = a % low_mask
      local high_part = math.floor(a / high_mask) * high_mask
      return high_part + v * powers[f] + low_part
    end

    return bit

    end  --}

  local function os_date(fmt, t)
    if t ~= nil then
      t = math.floor(t)
    end
    return os.date(fmt, t)
  end

  local original_format = string.format
  local function custom_format(fmt, ...)
    local args = {...}
    local arg_idx = 1
    local len = #fmt
    local i = 1
    while i <= len do
      local c = string.sub(fmt, i, i)
      if c == "%" then
        if string.sub(fmt, i + 1, i + 1) == "%" then
          i = i + 2
        else
          i = i + 1
          while i <= len do
            local next_c = string.sub(fmt, i, i)
            if string.match(next_c, "[cdiouxXceEfgGqsQ]") then
              local spec_type = next_c
              local val = args[arg_idx]
              if val ~= nil then
                if string.match(spec_type, "[diouxX]") then
                  local n = tonumber(val) or 0
                  if n ~= n or n == math.huge or n == -math.huge then
                    n = 0
                  end
                  local val32 = math.floor(n % 4294967296)
                  if val32 >= 2147483648 then
                    val32 = val32 - 4294967296
                  end
                  args[arg_idx] = math.tointeger(val32)
                elseif spec_type == "c" then
                  local n = tonumber(val) or 0
                  args[arg_idx] = math.tointeger(math.floor(n))
                end
              end
              arg_idx = arg_idx + 1
              i = i + 1
              break
            elseif string.match(next_c, "[-+ #0%d%.]") then
              i = i + 1
            else
              i = i + 1
              break
            end
          end
        end
      else
        i = i + 1
      end
    end
    return original_format(fmt, table.unpack(args))
  end

  local emptyFunction = function() end
  local bit32 = require('bit32')
  local newGlobals = {
    _G = _G,
    assert = assert,
    error = error,
    getmetatable = getmetatable,
    ipairs = ipairs,
    math = math,
    next = next,
    pairs = pairs,
    pcall = pcall,
    print = print,
    rawequal = rawequal,
    rawget = rawget,
    rawlen = rawlen,
    rawset = rawset,
    select = select,
    setmetatable = setmetatable,
    tonumber = tonumber,
    tostring = tostring,
    type = type,
    xpcall = xpcall,

    bit32 = {
      arshift	= bit32.arshift,
      band	= bit32.band,
      bnot	= bit32.bnot,
      bor	= bit32.bor,
      btest	= bit32.btest,
      bxor	= bit32.bxor,
      extract	= bit32.extract,
      lrotate	= bit32.lrotate,
      lshift	= bit32.lshift,
      replace	= bit32.replace,
      rrotate	= bit32.rrotate,
      rshift	= bit32.rshift,
    },

    coroutine = {
      create = coroutine.create,
      resume = coroutine.resume,
      running = coroutine.running,
      status = coroutine.status,
      wrap = coroutine.wrap,
      yield = coroutine.yield,
    },

    os = 	{
      date = os_date,
      difftime = os.difftime,
      time = os.time,
    },

    string = {
      byte = string.byte,
      char = string.char,
      dump = string.dump,
      find = string.find,
      format = custom_format,
      gmatch = string.gmatch,
      gsub = string.gsub,
      len = string.len,
      lower = string.lower,
      match = string.match,
      rep = string.rep,
      reverse	= string.reverse,
      sub = string.sub,
      upper	= string.upper,
    },

    table	= {
      concat = table.concat,
      foreach = table.foreach,
      foreachi = table.foreachi,
      pack = table.pack,
      sort = table.sort,
      unpack = table.unpack,
      insert = table.insert,
      remove = table.remove,
    },

    debug = {
      disableEventLog = emptyFunction,
      disableTimerLog = emptyFunction,
      getCurrentThreadName = function() return "Module" end,
      traceback = debug.traceback,
    },

    system = {
      bindMouse = emptyFunction,
      disableChatCommandDisplay = emptyFunction,
      exit = os.exit,
      giveAdventurePoint = emptyFunction,
      bindKeyboard = emptyFunction,
      giveEventGift = emptyFunction,
      loadFile = emptyFunction,
      loadPlayerData = emptyFunction,
      luaEventLaunchInterval = emptyFunction,
      newTimer = emptyFunction,
      openEventShop = emptyFunction,
      removeTimer = emptyFunction,
      saveFile = emptyFunction,
      savePlayerData = emptyFunction,
      setLuaEventBanner = emptyFunction,
    },

    ui = {
      addPopup = emptyFunction,
      removeTextArea = emptyFunction,
      setBackgroundColor = emptyFunction,
      setMapName = emptyFunction,
      setShamanName = emptyFunction,
      showColorPicker = emptyFunction,
      addTextArea = emptyFunction,
      updateTextArea = emptyFunction,
    },

    tfm = {
      exec = {
        bindKeyboard = emptyFunction,
        addImage = emptyFunction,
        chatMessage = emptyFunction,
        getPlayerSync = emptyFunction,
        giveConsumables = emptyFunction,
        lowerSyncDelay = emptyFunction,
        movePhysicObject = emptyFunction,
        playSound = emptyFunction,
        removePhysicObject = emptyFunction,
        setPlayerSync = emptyFunction,
        setRoomMaxPlayers = emptyFunction,
        setRoomPassword = emptyFunction,
        addBonus = emptyFunction,
        addConjuration = emptyFunction,
        addJoint = emptyFunction,
        addNPC = emptyFunction,
        addPhysicObject = emptyFunction,
        addShamanObject = emptyFunction,
        attachBalloon = emptyFunction,
        changePlayerSize= emptyFunction,
        disableAfkDeath = emptyFunction,
        disableAllShamanSkills = emptyFunction,
        disableAutoNewGame = emptyFunction,
        disableAutoScore = emptyFunction,
        disableAutoShaman = emptyFunction,
        disableAutoTimeLeft = emptyFunction,
        disableDebugCommand = emptyFunction,
        disableMinimalistMode = emptyFunction,
        disableMortCommand = emptyFunction,
        disablePhysicalConsumables = emptyFunction,
        disablePrespawnPreview = emptyFunction,
        disableWatchCommand = emptyFunction,
        displayParticle = emptyFunction,
        explosion = emptyFunction,
        freezePlayer = emptyFunction,
        giveMeep = emptyFunction,
        giveTransformations = emptyFunction,
        killPlayer = emptyFunction,
        linkMice = emptyFunction,
        moveObject = emptyFunction,
        movePlayer = emptyFunction,
        newGame = emptyFunction,
        playEmote = emptyFunction,
        playMusic = emptyFunction,
        playerVictory = emptyFunction,
        removeBonus = emptyFunction,
        removeCheese = emptyFunction,
        removeImage = emptyFunction,
        removeJoint = emptyFunction,
        removeObject = emptyFunction,
        respawnPlayer = emptyFunction,
        setAieMode = emptyFunction,
        setAutoMapFlipMode = emptyFunction,
        setGameTime = emptyFunction,
        setNameColor = emptyFunction,
        setPlayerGravityScale = emptyFunction,
        setPlayerNightMode = emptyFunction,
        setPlayerScore = emptyFunction,
        setShaman = emptyFunction,
        setShamanMode = emptyFunction,
        setVampirePlayer = emptyFunction,
        setWorldGravity = emptyFunction,
        snow = emptyFunction,
        stopMusic = emptyFunction,
        kickPlayer = emptyFunction,
        setPlayerLook = emptyFunction,
        setPlayerCollision = emptyFunction,
      },

      enum = {
        bonus	= {
          point = 0,
          speed = 1,
          death = 2,
          spring = 3,
          booster = 5,
          electricArc = 6,
        },
        emote	= {
          dance = 0,
          laugh = 1,
          cry = 2,
          kiss = 3,
          angry = 4,
          clap = 5,
          sleep = 6,
          facepaw = 7,
          sit = 8,
          confetti = 9,
          flag = 10,
          marshmallow = 11,
          selfie = 12,
          highfive = 13,
          highfive_1 = 14,
          highfive_2 = 15,
          partyhorn = 16,
          hug = 17,
          hug_1 = 18,
          hug_2 = 19,
          jigglypuff = 20,
          kissing = 21,
          kissing_1 = 22,
          kissing_2 = 23,
          carnaval = 24,
          rockpaperscissors = 25,
          rockpaperscissors_1 = 26,
          rockpaperscissor_2 = 27,
          laugh_2 = 28,
        },
        ground = {
          wood = 0,
          ice = 1,
          trampoline = 2,
          lava = 3,
          chocolate = 4,
          earth = 5,
          grass = 6,
          sand = 7,
          cloud = 8,
          water = 9,
          stone = 10,
          snow = 11,
          rectangle = 12,
          circle = 13,
          invisible = 14,
          web = 15,
          yellowGrass = 17,
          pinkGrass = 18,
          acid = 19,
        },
        particle = {
          whiteGlitter = 0,
          blueGlitter = 1,
          orangeGlitter = 2,
          cloud = 3,
          dullWhiteGlitter = 4,
          heart = 5,
          bubble = 6,
          tealGlitter = 9,
          spirit = 10,
          yellowGlitter = 11,
          ghostSpirit = 12,
          redGlitter = 13,
          waterBubble = 14,
          plus1 = 15,
          plus10 = 16,
          plus12 = 17,
          plus14 = 18,
          plus16 = 19,
          meep = 20,
          redConfetti = 21,
          greenConfetti = 22,
          blueConfetti = 23,
          yellowConfetti = 24,
          diagonalRain = 25,
          curlyWind = 26,
          wind = 27,
          rain = 28,
          star = 29,
          littleRedHeart = 30,
          littlePinkHeart = 31,
          daisy = 32,
          bell = 33,
          egg = 34,
          projection = 35,
          mouseTeleportation = 36,
          shamanTeleportation = 37,
          lollipopConfetti = 38,
          yellowCandyConfetti = 39,
          pinkCandyConfetti = 40,
        },
        shamanObject = {
          arrow = 0,
          littleBox = 1,
          box = 2,
          littleBoard = 3,
          board = 4,
          ball = 6,
          trampoline = 7,
          anvil = 10,
          cannon = 17,
          bomb = 23,
          orangePortal = 26,
          blueBalloon = 28,
          redBalloon = 29,
          greenBalloon = 30,
          yellowBalloon = 31,
          rune = 32,
          chicken = 33,
          snowBall = 34,
          cupidonArrow = 35,
          apple = 39,
          sheep = 40,
          littleBoardIce = 45,
          littleBoardChocolate = 46,
          iceCube = 54,
          cloud = 57,
          bubble = 59,
          tinyBoard = 60,
          companionCube = 61,
          stableRune = 62,
          balloonFish = 65,
          longBoard = 67,
          triangle = 68,
          sBoard = 69,
          paperPlane = 80,
          rock = 85,
          pumpkinBall = 89,
          tombstone = 90,
          paperBall = 95,
        },
      },

      get = {
        misc = {
          apiVersion = 0.28,
          transformiceVersion = 8.6,
        },
        room = {
          currentMap = 0,
          isTribeHouse = false,
          maxPlayers = 50,
          mirroredMap = false,
          objectList = {
            {
              angle = 0,
              baseType = 2,
              colors = {
                1,
                2,
                3,
              },
              ghost = false,
              id = 1,
              type = 203,
              vx = 0,
              vy = 0,
              x = 400,
              y = 200,
            },
          },
          passwordProtected = false,
          playerList = {
            ["Tigrounette#0001"] = {
              averageLatency = 400,
              cheeses = 0,
              community = "en",
              gender = 1,
              hasCheese = false,
              id = 0,
              inHardMode = 0,
              isDead = true,
              isFacingRight = true,
              isInvoking = false,
              isJumping = false,
              isShaman = false,
              isVampire = false,
              language = "int",
              look = "1;0,0,0,0,0,0,0,0,0,0,0,0",
              movingLeft = false,
              movingRight = false,
              playerName = "Tigrounette#0001",
              registrationDate = 1685021353267,
              score = 0,
              shamanMode = 0,
              spouseId = 1,
              spouseName = "Pikashu#0095",
              title = 0,
              tribeId = 1234,
              tribeName = "Kikoo",
              vx = 0,
              vy = 0,
              x = 0,
              y = 0,
            },
          },
          uniquePlayers = 1,
          xmlMapInfo = nil,
          language = "int",
          community = "xx",
          name = "*#test",
        },
      },
    },
  }

  local pairs = pairs
  local _G = _G
  local keys = {}

  for key in pairs(_G) do
    table.insert(keys, key)
  end

  for _, key in pairs(keys) do
    _G[key] = nil
  end

  for key, value in pairs(newGlobals) do
    _G[key] = value
  end
end`;
}
