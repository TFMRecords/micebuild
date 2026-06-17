if not __DEBUG__ then
  return function()end
end

local concat = table.concat

local function tabletostring(tbl, tabs)
  local str = { tabs, '{\n' }
  local n = 2
  local newtabs = tabs .. '  '

  for key, val in next, tbl do
    str[n + 1] = tabs
    str[n + 2] = '  '
    str[n + 3] = tostring(key)
    str[n + 4] = ' = '

    if type(val) == 'table' then
      str[n + 5] = tabletostring(tbl, newtabs)
    else
      str[n + 5] = tostring(val)
    end

    str[n + 6] = ',\n'
    n = n + 6
  end

  str[n + 1] = '}'

  return concat(str, '')
end

return function(...)
  local n = select("#", ...)

  if n == 0 or n == 1 and type(...) ~= "table" then
    print(...)
    return
  end

  local str = { ... }
  local argType

  for i=1, n do
    if type(str[i]) == 'table' then
      str[i] = tabletostring(str[i], '')
    else
      str[i] = tostring(str[i])
    end
  end

  print(concat(str, ''))
end