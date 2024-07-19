--[[
Input:
KEYS[1] batch metadata key
KEYS[2] batch data key
KEYS[3] locked metadata key
KEYS[4] locked data key
ARGV[1] current timestamp
ARGV[2] timestamp interval
Output:
-1 ERROR (lock existed for more than timeout)
-2 ERROR (lock existed for less than timeout)
0 OK (there is no batch to close)
1 OK (locking the batch)
if the previous batch is still locked then return the data for that batch
if no locked previous batch then just return the data for current batch
]]
local batchMetadataKey = KEYS[1]
local batchDataKey = KEYS[2]
local lockedMetadataKey = KEYS[3]
local lockedDataKey = KEYS[4]
local currentTimestamp = tonumber(ARGV[1])
local timestampInterval = tonumber(ARGV[2])
local rcall = redis.call

local metadata = rcall("GET",batchMetadataKey)
if not metadata then
   return {0}
end

local rawPreviousMetadata = rcall('GET', lockedMetadataKey)
if rawPreviousMetadata then
    local previousMetadata = cjson.decode(rawPreviousMetadata)
    local timePassed = currentTimestamp - tonumber(previousMetadata['lockTimestamp'])
    if timePassed > timestampInterval then
        return {-1, rcall('HGETALL', lockedDataKey), rawPreviousMetadata}
    else
        return {-2}
    end
end

rcall("RENAME",batchMetadataKey, lockedMetadataKey)
rcall("RENAME",batchDataKey, lockedDataKey)

local rawPreviousMetadata2 = rcall('GET', lockedMetadataKey)
local previousMetadata2 = cjson.decode(rawPreviousMetadata2)
previousMetadata2['lockTimestamp']=currentTimestamp
local encodedMetadata = cjson.encode(previousMetadata2)
rcall('SET', lockedMetadataKey, encodedMetadata)

return {1, rcall('HGETALL', lockedDataKey), encodedMetadata}



