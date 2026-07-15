import { join } from 'path';

/** Absolute path to the local uploads directory (served statically at /uploads). */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');
