--[[
Input:
KEYS[1] nonce key
ARGV[1] current nonce
Output:
N OK (current nonce)
]]
local nonceKey = KEYS[1]
local currentNonce = tonumber(ARGV[1])
local rcall = redis.call

local nonce = rcall("GET",nonceKey)
if not nonce or tonumber(nonce) < currentNonce then
   rcall('SET', nonceKey, currentNonce)
else
   rcall('INCR', nonceKey)
end
return rcall("GET", nonceKey)



