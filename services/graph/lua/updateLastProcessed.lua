--[[
Input:
KEYS[1] lastProcessedDsnpId key
ARGV[1] new lastProcessedDsnpId
ARGV[2] key expire time in seconds
Output:
1 if the lastProcessedDsnpId was updated
0 if the lastProcessedDsnpId was not updated
]]
local lastProcessedDsnpId = redis.call('GET', KEYS[1])
if lastProcessedDsnpId ~= ARGV[1] then
    redis.call('SETEX', KEYS[1], tonumber(ARGV[2]), ARGV[1])
    return 1
else
    return 0
end
