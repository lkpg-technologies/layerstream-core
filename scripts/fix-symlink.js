import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dist = join(process.cwd(), 'dist');
const linkName = join(dist, process.env.VITE_SYMLINK_NAME);

if (existsSync(linkName)) rmSync(linkName, { recursive: true });
execSync(`ln -s ${process.env.CURRENT_BUNDLE_PATH} ${linkName}`);
