import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (filepath: string) => void) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.git', 'proc', 'sys', 'dev', 'lib', 'usr', 'var', 'etc', 'usr', 'bin', 'sbin', 'boot', 'home', 'root'].includes(file)) continue;
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        walk(filepath, callback);
      } else {
        callback(filepath);
      }
    }
  } catch (err) {
    // Ignore errors for unreadable directories
  }
}

console.log('Searching for files modified in the last 2 hours...');
const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
walk('/app', (filepath) => {
  try {
    const stat = fs.statSync(filepath);
    if (stat.mtimeMs > twoHoursAgo) {
      console.log(`${filepath} - Modified At: ${new Date(stat.mtime).toISOString()}`);
    }
  } catch (err) {}
});
walk('/tmp', (filepath) => {
  try {
    const stat = fs.statSync(filepath);
    if (stat.mtimeMs > twoHoursAgo) {
      console.log(`${filepath} - Modified At: ${new Date(stat.mtime).toISOString()}`);
    }
  } catch (err) {}
});
