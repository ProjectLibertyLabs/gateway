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
