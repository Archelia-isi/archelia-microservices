const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.css') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (file.endsWith('.css')) {
    // 1. Hardcoded black text -> var(--color-text)
    content = content.replace(/color:\s*(#000|#000000|#111|#111111|#1d1d1f|black|#333|#333333);\s*/gi, 'color: var(--color-text); ');

    // 2. Hardcoded gray text -> var(--color-text-muted)
    content = content.replace(/color:\s*(#555|#666|#777|#888|#86868b);\s*/gi, 'color: var(--color-text-muted); ');

    // 3. Hardcoded light gray borders -> var(--color-border)
    content = content.replace(/border-color:\s*(#ddd|#ccc|#eee|#e5e5ea|#d1d5db);\s*/gi, 'border-color: var(--color-border); ');
    content = content.replace(/border:\s*1px\s+solid\s+(#ddd|#ccc|#eee|#e5e5ea|#d1d5db)/gi, 'border: 1px solid var(--color-border)');

    // 4. Hardcoded light gray backgrounds (for containers/inputs) -> var(--color-surface-solid) or transparent
    content = content.replace(/background(-color)?:\s*(#f5f5f7|#f1f1f1|#fafafa|#f9f9f9|#eee|#e5e5ea);\s*/gi, 'background$1: var(--color-surface-solid); ');

    // 5. Box shadows with hardcoded black alpha that might look bad in dark mode (keep as is if using rgba, but maybe adjust)
    // Actually, rgba(0,0,0, 0.1) looks okay in dark mode, but maybe we can just let it be.

    // 6. Fix specific Badges in ReviewAccordion
    if (file.includes('ReviewAccordion.css')) {
      content = content.replace(/background:\s*#fff8e6;\s*color:\s*#d97706;/gi, 'background: rgba(217, 119, 6, 0.15); color: #d97706;');
      content = content.replace(/background:\s*#e8f5e9;\s*color:\s*#28a745;/gi, 'background: rgba(40, 167, 69, 0.15); color: #28a745;');
      content = content.replace(/background:\s*#fee2e2;\s*color:\s*#dc2626;/gi, 'background: rgba(220, 38, 38, 0.15); color: #dc2626;');
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated: ${file.replace(srcDir, '')}`);
  }
});

console.log(`\nEnhanced dark mode in ${changedFiles} files!`);
