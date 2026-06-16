import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (filepath: string) => void) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.git', 'dist'].includes(file)) continue;
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

console.log('Searching /app for all PNG, JPG, and SVG files...');
walk('/app', (filepath) => {
  const ext = path.extname(filepath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) {
    console.log(filepath);
  }
});



