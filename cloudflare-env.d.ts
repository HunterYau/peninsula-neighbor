declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    COMMUNITY_ADMIN_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
