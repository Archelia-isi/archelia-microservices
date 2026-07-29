const fs = require('fs');
const path = require('path');

const uiDir = path.join(__dirname, 'src', 'components', 'ui');
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.css'));

let changedFiles = 0;

files.forEach(file => {
  const filePath = path.join(uiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace hardcoded white backgrounds in rgba
  content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'background: var(--color-surface)');
  content = content.replace(/background:\s*#ffffff/gi, 'background: var(--color-surface-solid)');
  content = content.replace(/background-color:\s*#ffffff/gi, 'background-color: var(--color-surface-solid)');
  content = content.replace(/background:\s*#f5f5f7/gi, 'background: var(--color-surface-solid)');
  
  // Replace borders
  content = content.replace(/border:\s*1px\s*solid\s*rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/g, 'border: 1px solid var(--color-border)');
  content = content.replace(/border:\s*1px\s*solid\s*#333333/g, 'border: 1px solid var(--color-border)');
  content = content.replace(/border-color:\s*rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)/g, 'border-color: var(--color-border)');

  // Dropzone gradient: background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
  content = content.replace(/linear-gradient\(.*?#ffffff.*?\)/g, 'linear-gradient(135deg, var(--color-surface-solid) 0%, var(--color-surface) 100%)');

  // Hardcoded blacks
  content = content.replace(/color:\s*#000000/gi, 'color: var(--color-text-main)');
  content = content.replace(/color:\s*#1d1d1f/gi, 'color: var(--color-text-main)');
  content = content.replace(/color:\s*#1a1a1a/gi, 'color: var(--color-text-main)');
  
  // Hardcoded dark backgrounds (like ContextMenu uses #1a1a1a or #333333)
  content = content.replace(/background:\s*#1a1a1a/gi, 'background: var(--color-surface-solid)');
  content = content.replace(/background:\s*#333333/gi, 'background: var(--color-hover-dark)');
  content = content.replace(/background-color:\s*#1a1a1a/gi, 'background-color: var(--color-surface-solid)');
  content = content.replace(/background-color:\s*#333333/gi, 'background-color: var(--color-hover-dark)');

  // Secondary text
  content = content.replace(/color:\s*#86868b/gi, 'color: var(--color-text-muted)');
  
  // Badge colors:
  content = content.replace(/background:\s*#dcfce7/gi, 'background: rgba(34, 197, 94, 0.15)'); // green
  content = content.replace(/color:\s*#15803d/gi, 'color: #22c55e');
  
  content = content.replace(/background:\s*#fef3c7/gi, 'background: rgba(245, 158, 11, 0.15)'); // yellow
  content = content.replace(/color:\s*#b45309/gi, 'color: #f59e0b');
  
  content = content.replace(/background:\s*#fee2e2/gi, 'background: rgba(239, 68, 68, 0.15)'); // red
  content = content.replace(/color:\s*#b91c1c/gi, 'color: #ef4444');
  
  content = content.replace(/background:\s*#f1f5f9/gi, 'background: rgba(148, 163, 184, 0.15)'); // gray
  content = content.replace(/color:\s*#475569/gi, 'color: var(--color-text-muted)');
  
  // Button colors
  content = content.replace(/background:\s*#fbfbfd/gi, 'background: var(--color-surface-solid)');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${file}`);
    changedFiles++;
  }
});

console.log(`\nEnhanced dark mode in ${changedFiles} UI component files!`);
