const fs = require('fs');
const path = require('path');

function getAllCssFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllCssFiles(filePath));
    } else if (file.endsWith('.css')) {
      results.push(filePath);
    }
  });
  return results;
}

const srcDir = path.join(__dirname, 'src');
const files = getAllCssFiles(srcDir);

let changedFiles = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Background rgba whites
  content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/gi, 'background: var(--color-surface)');
  content = content.replace(/background-color:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/gi, 'background-color: var(--color-surface)');
  
  // Solid whites
  content = content.replace(/background:\s*#ffffff/gi, 'background: var(--color-surface-solid)');
  content = content.replace(/background-color:\s*#ffffff/gi, 'background-color: var(--color-surface-solid)');
  content = content.replace(/background:\s*#f5f5f7/gi, 'background: var(--color-surface-solid)');
  
  // Hardcoded blacks
  content = content.replace(/color:\s*#000000/gi, 'color: var(--color-text-main)');
  content = content.replace(/color:\s*#1d1d1f/gi, 'color: var(--color-text-main)');
  
  // Borders
  content = content.replace(/border:\s*1px\s*solid\s*rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/gi, 'border: 1px solid var(--color-border)');
  content = content.replace(/border-color:\s*rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/gi, 'border-color: var(--color-border)');
  content = content.replace(/border:\s*1px\s*solid\s*#e5e5ea/gi, 'border: 1px solid var(--color-border)');
  content = content.replace(/border-color:\s*#e5e5ea/gi, 'border-color: var(--color-border)');
  content = content.replace(/border-bottom:\s*1px\s*solid\s*#e5e5ea/gi, 'border-bottom: 1px solid var(--color-border)');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${path.relative(__dirname, filePath)}`);
    changedFiles++;
  }
});

console.log(`\nEnhanced dark mode in ${changedFiles} total CSS files!`);
