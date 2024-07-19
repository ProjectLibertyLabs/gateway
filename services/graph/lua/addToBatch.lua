--[[
Input:
KEYS[1] batch metadata key
KEYS[2] batch data key
ARGV[1] metadata
ARGV[2] Job id
ARGV[3] data
Output:
-1 ERROR
1 OK  (new batch)
N OK  (number of existing rows)
]]
local batchMetadataKey = KEYS[1]
local batchDataKey = KEYS[2]
local newMetadata = ARGV[1]
local newJobId = ARGV[2]
local newData = ARGV[3]
local rcall = redis.call
local rawMetadata = rcall("GET",batchMetadataKey)
local currentCount = 1
if rawMetadata then
    local metadata = cjson.decode(rawMetadata)
    local rowCount = metadata['rowCount']
    if not rowCount then
        return -1
    end
    currentCount = rowCount + 1
    metadata['rowCount'] = currentCount
    rcall("SET", batchMetadataKey, cjson.encode(metadata))
else
    rcall("SET", batchMetadataKey, newMetadata)
end
rcall("HSETNX", batchDataKey, newJobId, newData)
return currentCount



