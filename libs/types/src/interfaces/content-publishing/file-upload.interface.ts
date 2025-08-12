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

/**
 * Response for content publishing announcement endpoint
 */
export interface IAnnouncementResponse {
  referenceId: string;
}

/**
 * Upload response containing asset IDs
 */
export interface IUploadResponseV1 {
  assetIds: string[];
}

/**
 * Files upload request DTO interface
 */
export interface IFilesUpload {
  files: any[];
}

/**
 * Interface for tracking successful file uploads with their original index
 */
export interface ISuccessfulUpload {
  uploadResult: IFileResponse;
  originalIndex: number;
}
