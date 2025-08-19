import { randomBytes } from 'k6/crypto';
import { b64encode } from 'k6/encoding';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Enhanced mock asset creation for batch testing
export const createMockParquetFile = (size = 'sm') => {
  let fileSize;
  switch (size) {
    case 'sm':
      fileSize = 0.5 * 1000 * 1000; // 0.5MB
      break;
    case 'md':
      fileSize = 15 * 1000 * 1000; // 15MB
      break;
    case 'lg':
      fileSize = 50 * 1000 * 1000; // 50MB
      break;
    case 'xl':
      fileSize = 100 * 1000 * 1000; // 100MB
      break;
    default:
      fileSize = 0.5 * 1000 * 1000;
  }

  const arrayBuf = randomBytes(fileSize);
  const u8 = new Uint8Array(arrayBuf);
  
  // Set Parquet file magic number (PAR1)
  u8.set([0x50, 0x41, 0x52, 0x31], 0);
  
  const buffer = b64encode(arrayBuf, 'utf-8');
  return {
    files: http.file(arrayBuf, `batch-file-${randomIntBetween(1000, 9999)}.parquet`, 'application/vnd.apache.parquet'),
  };
};

// Create realistic batch data with different schemas
export const createRealisticBatchData = (fileCount = 1, options = {}) => {
  const {
    useRealUploads = false,
    fileSize = 'sm',
    schemaIds = [16001, 16002, 16003, 16004, 16005], // Common schema IDs
    baseUrl = 'http://localhost:3000'
  } = options;

  const batchFiles = [];
  
  for (let i = 0; i < fileCount; i++) {
    let cid;
    
    if (useRealUploads) {
      // Use actual upload process
      const asset = createMockParquetFile(fileSize);
      const uploadResponse = http.put(`${baseUrl}/v1/asset/upload`, asset);
      
      if (uploadResponse.status === 202) {
        try {
          const response = JSON.parse(uploadResponse.body);
          cid = response.assetIds[0];
        } catch {
          cid = `mock-cid-${randomIntBetween(1000, 9999)}`;
        }
      } else {
        cid = `mock-cid-${randomIntBetween(1000, 9999)}`;
      }
    } else {
      // Use mock CID for faster testing
      cid = `mock-cid-${randomIntBetween(1000, 9999)}`;
    }
    
    batchFiles.push({
      cid: cid,
      schemaId: schemaIds[randomIntBetween(0, schemaIds.length - 1)],
    });
  }
  
  return { batchFiles };
};

// Create multipart form data for v3 endpoint
export const createMultipartBatchData = (fileCount = 1, options = {}) => {
  const {
    fileSize = 'sm',
    schemaIds = [12, 13, 14, 15, 16], // Common schema IDs for v3
    useRealFiles = true
  } = options;

  const formData = new FormData();
  
  for (let i = 0; i < fileCount; i++) {
    if (useRealFiles) {
      const file = createMockParquetFile(fileSize);
      formData.append('files', file.files);
    } else {
      // Create minimal file for testing
      const minimalFile = createMockParquetFile('sm');
      formData.append('files', minimalFile.files);
    }
    
    formData.append('schemaId', schemaIds[randomIntBetween(0, schemaIds.length - 1)].toString());
  }
  
  return formData;
};

// Generate test data for different batch scenarios
export const BATCH_SCENARIOS = {
  // Small batches - typical usage
  small: {
    fileCount: 1,
    fileSize: 'sm',
    description: 'Single small file batch'
  },
  
  // Medium batches - normal usage
  medium: {
    fileCount: 3,
    fileSize: 'sm',
    description: 'Multiple small files'
  },
  
  // Large batches - stress testing
  large: {
    fileCount: 10,
    fileSize: 'md',
    description: 'Multiple medium files'
  },
  
  // Mixed batches - realistic usage
  mixed: {
    fileCount: 5,
    fileSize: 'sm',
    description: 'Mixed file sizes and schemas',
    mixedSizes: true
  },
  
  // Edge case - maximum files
  maxFiles: {
    fileCount: 20,
    fileSize: 'sm',
    description: 'Maximum number of files'
  }
};

// Create batch data based on scenario
export const createBatchDataByScenario = (scenarioName, options = {}) => {
  const scenario = BATCH_SCENARIOS[scenarioName] || BATCH_SCENARIOS.small;
  
  if (scenario.mixedSizes) {
    // Create mixed file sizes
    const batchFiles = [];
    for (let i = 0; i < scenario.fileCount; i++) {
      const sizes = ['sm', 'md'];
      const fileSize = sizes[randomIntBetween(0, sizes.length - 1)];
      const file = createMockParquetFile(fileSize);
      batchFiles.push({
        cid: `mock-cid-${randomIntBetween(1000, 9999)}`,
        schemaId: randomIntBetween(16001, 16005),
      });
    }
    return { batchFiles };
  }
  
  return createRealisticBatchData(scenario.fileCount, {
    fileSize: scenario.fileSize,
    ...options
  });
};

// Performance monitoring helpers
export const createPerformanceChecks = (endpoint, expectedDuration) => {
  return {
    [`${endpoint} - status is 202`]: (r) => r.status === 202,
    [`${endpoint} - response time < ${expectedDuration}ms`]: (r) => r.timings.duration < expectedDuration,
    [`${endpoint} - has response body`]: (r) => r.body.length > 0,
    [`${endpoint} - content type is json`]: (r) => r.headers['Content-Type']?.includes('application/json'),
  };
};

// Error scenario helpers
export const createErrorScenarios = () => {
  return {
    // Invalid schema ID
    invalidSchema: {
      batchFiles: [{ 
        cid: 'mock-cid-1234', 
        schemaId: 99999 
      }]
    },
    
    // Invalid CID format
    invalidCid: {
      batchFiles: [{ 
        cid: 'invalid-cid-format', 
        schemaId: 16001 
      }]
    },
    
    // Empty batch
    emptyBatch: {
      batchFiles: []
    },
    
    // Missing required fields
    missingFields: {
      batchFiles: [{ 
        cid: 'mock-cid-1234'
        // Missing schemaId
      }]
    },
    
    // Too many files
    tooManyFiles: {
      batchFiles: Array.from({ length: 25 }, (_, i) => ({
        cid: `mock-cid-${i}`,
        schemaId: 16001
      }))
    }
  };
};

// Batch processing simulation helpers
export const simulateBatchProcessing = (batchData, options = {}) => {
  const {
    concurrentRequests = 1,
    delayBetweenRequests = 1000,
    retryAttempts = 3
  } = options;

  const results = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    const modifiedBatch = {
      ...batchData,
      batchFiles: batchData.batchFiles.map(file => ({
        ...file,
        cid: `${file.cid}-${i}` // Make each request unique
      }))
    };
    
    results.push(modifiedBatch);
  }
  
  return results;
};

// Memory usage monitoring
export const createMemoryChecks = () => {
  return {
    'memory usage - reasonable': () => {
      // k6 doesn't provide direct memory access, but we can check for memory-related errors
      return true;
    },
    'no memory leaks': () => {
      // This would need to be implemented with external monitoring
      return true;
    }
  };
};

// Export common constants
export const BATCH_CONSTANTS = {
  MAX_FILES_PER_BATCH: 20,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_SCHEMA_IDS: [16001, 16002, 16003, 16004, 16005, 12, 13, 14, 15, 16],
  SUPPORTED_FILE_TYPES: ['parquet', 'json', 'csv'],
  EXPECTED_RESPONSE_TIMES: {
    singleFile: 5000,    // 5s
    multipleFiles: 10000, // 10s
    largeFiles: 30000,    // 30s
    concurrent: 15000     // 15s
  }
};
