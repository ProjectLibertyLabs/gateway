-- Get Redis health metrics and queue status
local results = {}
local info = redis.call('INFO', 'memory', 'clients', 'server')

local used_memory = string.match(info, "used_memory:(%d+)")
local maxmemory = string.match(info, "maxmemory:(%d+)")
local redis_version = string.match(info, "redis_version:([^\r\n]+)")
local uptime_in_seconds = string.match(info, "uptime_in_seconds:(%d+)")
local connected_clients = string.match(info, "connected_clients:(%d+)")

-- Process queues in batches
for i, prefix in ipairs(ARGV) do
  local waiting = redis.call('LLEN', prefix .. ':wait')
  local active = redis.call('LLEN', prefix .. ':active')
  local completed = redis.call('LLEN', prefix .. ':completed')
  local failed = redis.call('LLEN', prefix .. ':failed')
  local delayed = redis.call('ZCARD', prefix .. ':delayed')
  
  -- Strip 'bull:' prefix from queue name for display
  local queue_name = string.gsub(prefix, '^bull:', '')
  
  -- Use table.insert to ensure proper array structure
  table.insert(results, {
    name = queue_name,
    waiting = waiting,
    active = active,
    completed = completed,
    failed = failed,
    delayed = delayed
  })
end

return cjson.encode({
  redis_version = redis_version,
  used_memory = tonumber(used_memory),
  maxmemory = tonumber(maxmemory),
  uptime_in_seconds = tonumber(uptime_in_seconds),
  connected_clients = tonumber(connected_clients),
  queues = results
})
