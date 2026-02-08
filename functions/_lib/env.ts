export interface Env {
  SECRET_SALT: string;
  DATASET_VERSION?: string;
  PUZZLE_EPOCH?: string;
  RATE_LIMIT_KV?: KVNamespace;
}

