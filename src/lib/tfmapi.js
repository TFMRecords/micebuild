export default function() {
  return `do
  package.preload.bit32 = function ()     --{

    -- no built-in 'bit32' library: implement it using bitwise operators

    local bit = {}

    function bit.bnot (a)
      return ~a & 0xFFFFFFFF
    end


    --
    -- in all vararg functions, avoid creating 'arg' table when there are
    -- only 2 (or less) parameters, as 2 parameters is the common case
    --

    function bit.band (x, y, z, ...)
      if not z then
        return ((x or -1) & (y or -1)) & 0xFFFFFFFF
      else
        local arg = {...}
        local res = x & y & z
        for i = 1, #arg do res = res & arg[i] end
        return res & 0xFFFFFFFF
      end
    end

    function bit.bor (x, y, z, ...)
      if not z then
        return ((x or 0) | (y or 0)) & 0xFFFFFFFF
      else
        local arg = {...}
        local res = x | y | z
        for i = 1, #arg do res = res | arg[i] end
        return res & 0xFFFFFFFF
      end
    end

    function bit.bxor (x, y, z, ...)
      if not z then
        return ((x or 0) ~ (y or 0)) & 0xFFFFFFFF
      else
        local arg = {...}
        local res = x ~ y ~ z
        for i = 1, #arg do res = res ~ arg[i] end
        return res & 0xFFFFFFFF
      end
    end

    function bit.btest (...)
      return bit.band(...) ~= 0
    end

    function bit.lshift (a, b)
      return ((a & 0xFFFFFFFF) << b) & 0xFFFFFFFF
    end

    function bit.rshift (a, b)
      return ((a & 0xFFFFFFFF) >> b) & 0xFFFFFFFF
    end

    function bit.arshift (a, b)
      a = a & 0xFFFFFFFF
      if b <= 0 or (a & 0x80000000) == 0 then
        return (a >> b) & 0xFFFFFFFF
      else
        return ((a >> b) | ~(0xFFFFFFFF >> b)) & 0xFFFFFFFF
      end
    end

    function bit.lrotate (a ,b)
      b = b & 31
      a = a & 0xFFFFFFFF
      a = (a << b) | (a >> (32 - b))
      return a & 0xFFFFFFFF
    end

    function bit.rrotate (a, b)
      return bit.lrotate(a, -b)
    end

    local function checkfield (f, w)
      w = w or 1
      assert(f >= 0, "field cannot be negative")
      assert(w > 0, "width must be positive")
      assert(f + w <= 32, "trying to access non-existent bits")
      return f, ~(-1 << w)
    end

    function bit.extract (a, f, w)
      local f, mask = checkfield(f, w)
      return (a >> f) & mask
    end

    function bit.replace (a, v, f, w)
      local f, mask = checkfield(f, w)
      v = v & mask
      a = (a & ~(mask << f)) | (v << f)
      return a & 0xFFFFFFFF
    end

    return bit

    end  --}


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
      date = os.date,
      difftime = os.difftime,
      time = os.time,
    },

    string = {
      byte = string.byte,
      char = string.char,
      dump = string.dump,
      find = string.find,
      format = string.format,
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
