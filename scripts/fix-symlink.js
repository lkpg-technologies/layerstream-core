import { existsSync, lstatSync, rmSync, symlinkSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { VITE_SYMLINK_NAME, CURRENT_BUNDLE_PATH } = process.env;

if (!VITE_SYMLINK_NAME || !CURRENT_BUNDLE_PATH) {
    console.error('VITE_SYMLINK_NAME and CURRENT_BUNDLE_PATH must both be set');
    process.exit(1);
}

const dist = join(process.cwd(), 'dist');
if (!existsSync(dist)) {
    console.error(`${dist} does not exist, run the build first`);
    process.exit(1);
}

const linkName = join(dist, VITE_SYMLINK_NAME);

// lstat (not existsSync) so a dangling symlink is also replaced
try {
    lstatSync(linkName);
    rmSync(linkName, { recursive: true, force: true });
} catch {
    // Nothing to remove
}

symlinkSync(CURRENT_BUNDLE_PATH, linkName);
console.info(`Linked ${linkName} -> ${CURRENT_BUNDLE_PATH}`);
