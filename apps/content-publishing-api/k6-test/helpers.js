import { validContentNoUploadedAssets } from '../test/mockRequestData.ts';
import { b64encode } from 'k6/encoding';
import http from 'k6/http';
import { check } from 'k6';

export const mockAsset = (size) => {
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
  const char = 'g';
  const str = char.repeat(fileSize);
  const buffer = b64encode(str, 'utf-8');
  return {
    files: http.file(buffer, 'file1.jpg', 'image/jpeg'),
  };
};

export const getReferenceId = (baseUrl) => {
  const asset = mockAsset('sm');
  // Send the PUT request
  const assetRequest = http.put(baseUrl + `/v1/asset/upload`, asset);
  let referenceId = '';
  check(assetRequest, {
    '': (r) => (referenceId = JSON.parse(r.body).assetIds[0]),
  });
  return referenceId;
};

export const createContentWithAsset = (baseUrl) => {
  const referenceId = getReferenceId(baseUrl);
  return Object.assign({}, validContentNoUploadedAssets, {
    assets: [
      {
        name: 'file1.jpg',
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
