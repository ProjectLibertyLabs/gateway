import { validContentNoUploadedAssets, validOnChainContent } from '../test/mockRequestData.ts';
import { b64encode } from 'k6/encoding';
import http from 'k6/http';
import { check } from 'k6';
import { randomBytes } from 'k6/crypto';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js';

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
  }
  const arrayBuf = randomBytes(fileSize);
  const buffer = b64encode(arrayBuf, 'utf-8');
  return {
    files: http.file(buffer, `file1.${extension}`, mimetype),
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
