import { validContentNoUploadedAssets, validOnChainContent } from '../test/mockRequestData.ts';
import { b64encode } from 'k6/encoding';
import http from 'k6/http';
import { check } from 'k6';
import { randomBytes } from 'k6/crypto';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

validOnChainContent.payload = `0x${randomString(1024, 'abcdef0123456789')}`;

export const mockAsset = (size, extension = 'jpg', mimetype = 'image/jpeg') => {
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
      fileSize = 0.5 * 1000 * 1000; // 0.5MB
  }
  let arrayBuf = randomBytes(fileSize);
  let u8;

  // We need to generate file content with correct "magic number" file headers in order
  // to pass the MIME type filter on upload
  switch (mimetype) {
    case 'image/jpeg':
      u8 = new Uint8Array(arrayBuf);
      u8.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01], 0);
      arrayBuf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      break;

    case 'audio/ogg':
      u8 = new Uint8Array(arrayBuf);
      u8.set([0x4f, 0x67, 0x67, 0x53]);
      arrayBuf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      break;

    case 'application/vnd.apache.parquet':
      u8 = new Uint8Array(arrayBuf);
      u8.set([0x50, 0x41, 0x52, 0x31]);
      arrayBuf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      break;

    default:
  }
  const buffer = b64encode(arrayBuf, 'utf-8');
  return {
    files: http.file(arrayBuf, `file1.${extension}`, mimetype),
  };
};

export const getReferenceId = (baseUrl, extension = 'jpg', mimetype = 'image/jpeg') => {
  const asset = mockAsset('sm', extension, mimetype);
  // Send the PUT request
  const assetRequest = http.put(baseUrl + `/v1/asset/upload`, asset);
  let referenceId = '';
  check(assetRequest, {
    '': (r) => (referenceId = JSON.parse(r.body).assetIds[0]),
  });
  return referenceId;
};

export const createContentWithAsset = (baseUrl, extension = 'jpg', mimetype = 'image/jpeg') => {
  const referenceId = getReferenceId(baseUrl, extension, mimetype);
  return Object.assign({}, validContentNoUploadedAssets, {
    assets: [
      {
        name: `file1.${extension}`,
        references: [
          {
            referenceId: referenceId,
            height: 123,
            width: 321,
          },
        ],
      },
    ],
  });
};

// ============================================================================
// BATCH ANNOUNCEMENT HELPERS
// ============================================================================

// Valid CID v1 examples for testing
const VALID_CIDS = [
  'bafybeihs2f53wuxypxctus6m5egrcxdruykhps5v6bwz3y6wbsxstxwjdi',
  'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  'bafybeihs2f53wuxypxctus6m5egrcxdruykhps5v6bwz3y6wbsxstxwjdi',
  'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  'bafybeihs2f53wuxypxctus6m5egrcxdruykhps5v6bwz3y6wbsxstxwjdi',
  'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  'bafybeihs2f53wuxypxctus6m5egrcxdruykhps5v6bwz3y6wbsxstxwjdi',
  'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  'bafybeihs2f53wuxypxctus6m5egrcxdruykhps5v6bwz3y6wbsxstxwjdi',
  'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
];

// Export common constants
export const BATCH_CONSTANTS = {
  MAX_FILES_PER_BATCH: 20,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_SCHEMA_IDS: [12, 13], // Valid schema IDs
  SUPPORTED_FILE_TYPES: ['parquet', 'jpg', 'png'], // TODO: Add all file types relevantIDs
  EXPECTED_RESPONSE_TIMES: {
    singleFile: 5000,    // 5s
    multipleFiles: 10000, // 10s
    largeFiles: 30000,    // 30s
    concurrent: 15000     // 15s
  }
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

// Helper function to create mock file data
export const createMockFileData = (size = 'sm') => {
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
      fileSize = 0.5 * 1000 * 1000; // 0.5MB
  }

  const arrayBuf = randomBytes(fileSize);
  const u8 = new Uint8Array(arrayBuf);
  
  // Set Parquet file magic number (PAR1)
  u8.set([0x50, 0x41, 0x52, 0x31], 0);
  
  return arrayBuf;
};

// Enhanced mock asset creation for batch testing
export const createMockFile = (size = 'sm') => {
  const fileData = createMockFileData(size);
  const fileName = `batch-file-${randomIntBetween(1000, 9999)}.parquet`;
  
  return {
    files: http.file(fileData, fileName, 'application/vnd.apache.parquet'),
  };
};

// Create realistic batch data with different schemas
export const createRealisticBatchData = (fileCount = 1, options = {}) => {
  const {
    useRealUploads = false, // Changed back to false to avoid overwhelming the service
    fileSize = 'sm',
    schemaIds = BATCH_CONSTANTS.SUPPORTED_SCHEMA_IDS,
    baseUrl = 'http://localhost:3010'
  } = options;

  const batchFiles = [];
  
  for (let i = 0; i < fileCount; i++) {
    let cid;
    
    if (useRealUploads) {
      // Use actual upload process
      const asset = createMockFile(fileSize);
      const uploadResponse = http.put(`${baseUrl}/v1/asset/upload`, asset);
      
      if (uploadResponse.status === 202) {
        try {
          const response = JSON.parse(uploadResponse.body);
          cid = response.assetIds[0];
        } catch {
          // Use valid CID from our list as fallback
          cid = VALID_CIDS[randomIntBetween(0, VALID_CIDS.length - 1)];
        }
      } else {
        // Use valid CID from our list as fallback
        cid = VALID_CIDS[randomIntBetween(0, VALID_CIDS.length - 1)];
      }
    } else {
      // Use valid CID from our list
      cid = VALID_CIDS[randomIntBetween(0, VALID_CIDS.length - 1)];
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
    schemaIds = BATCH_CONSTANTS.SUPPORTED_SCHEMA_IDS,
    baseUrl = 'http://localhost:3010'
  } = options;

  // Create multipart form data with actual files
  const formData = {};
  
  // Add files to the form data
  for (let i = 0; i < fileCount; i++) {
    const asset = mockAsset(fileSize, 'parquet', 'application/vnd.apache.parquet');
    formData[`files`] = asset.files;
  }
  
  // Add schema ID (use the first one for simplicity in stress testing)
  const schemaId = schemaIds[randomIntBetween(0, schemaIds.length - 1)];
  formData[`schemaId`] = schemaId.toString();
  
  return formData;
};

// Error scenario helpers
export const createErrorScenarios = () => {
  return {
    // Invalid schema ID
    invalidSchema: {
      batchFiles: [{ 
        cid: VALID_CIDS[0], 
        schemaId: 99999 
      }]
    },
    
    // Invalid CID format
    invalidCid: {
      batchFiles: [{ 
        cid: 'invalid-cid-format', 
        schemaId: 12 
      }]
    },
    
    // Empty batch
    emptyBatch: {
      batchFiles: []
    },
    
    // Missing required fields
    missingFields: {
      batchFiles: [{ 
        cid: VALID_CIDS[0]
        // Missing schemaId
      }]
    },
    
    // Too many files
    tooManyFiles: {
      batchFiles: Array.from({ length: 25 }, (_, i) => ({
        cid: VALID_CIDS[i % VALID_CIDS.length],
        schemaId: 12
      }))
    }
  };
};
