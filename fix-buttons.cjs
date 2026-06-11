const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace text-white with text-[var(--c-bg)] when button has bg-[var(--c-text)]
    let replaced = content.replace(/(bg-\[var\(--c-text\)\][^"']*?)text-white/g, '$1text-[var(--c-bg)]');
    // Replace hover:bg-[#2C2825] with hover:opacity-90
    replaced = replaced.replace(/hover:bg-\[#2C2825\]/g, 'hover:opacity-90');
    if (content !== replaced) {
      fs.writeFileSync(filePath, replaced);
      console.log('Updated', filePath);
    }
  }
});
