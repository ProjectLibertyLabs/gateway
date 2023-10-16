/**
 * Interface for chain filter options
 * @interface IChainWatchOptions
 * @property {string[]} schemaIds - The schema ids for which content should be watched for
 * @property {string[]} msa_ids - The msa ids for which content should be watched for
 */
export interface IChainWatchOptions {
  // Specific schema ids to watch for
  schemaIds: string[];
  // Specific msa ids to watch for
  msa_ids: string[];
}
