/**
 * Response value containing the upload status of a single file.
 * Will either contain the CID of a file successfully uploaded to IPFS,
 * or an error indicated a failure to upload.
 */
export interface IFileResponse {
  cid?: string;
  error?: string;
}

/**
 * Response from the /v2/asset/upload endpoint.
 * The order of files in the result matches the order in the initiating upload request object.
 */
export interface IUploadResponse {
  files: IFileResponse[];
}
