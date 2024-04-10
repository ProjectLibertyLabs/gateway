--[[
Input:
KEYS[1] lastProcessedMsaId key
ARGV[1] new lastProcessedMsaId
ARGV[2] key expire time in seconds
Output:
1 if the lastProcessedMsaId was updated
0 if the lastProcessedMsaId was not updated
]]
local lastProcessedMsaId = redis.call('GET', KEYS[1])
if lastProcessedMsaId ~= ARGV[1] then
    redis.call('SETEX', KEYS[1], tonumber(ARGV[2]), ARGV[1])
    return 1
else
    return 0
end
