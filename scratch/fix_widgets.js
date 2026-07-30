const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'apps', 'ui-server', 'src', 'components', 'os', 'widgets');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Widget.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix global padding
  content = content.replace(/padding: '16px'/g, "padding: '12px'");
  content = content.replace(/gap: '16px'/g, "gap: '8px'");
  content = content.replace(/gap: '12px'/g, "gap: '8px'");
  
  // Widget-specific fixes
  if (file === 'FinanceWidget.tsx') {
    content = content.replace(/padding: '12px'/g, "padding: '8px'");
    content = content.replace(/marginBottom: '8px'/g, "marginBottom: '4px'");
    content = content.replace(/marginBottom: '12px'/g, "marginBottom: '8px'");
    content = content.replace(/marginBottom: '16px'/g, "marginBottom: '8px'");
  }
  
  if (file === 'NewsWidget.tsx') {
    content = content.replace(/news\.slice\(0, 3\)/g, "news.slice(0, 2)");
  }
  
  if (file === 'TranslatorWidget.tsx') {
    content = content.replace(/minHeight: isLarge \? '0' : '80px'/g, "minHeight: isLarge ? '0' : '50px'");
  }
  
  if (file === 'CopywriterWidget.tsx') {
    content = content.replace(/height: isLarge \? '80px' : '60px'/g, "height: isLarge ? '80px' : '40px'");
  }

  if (file === 'PendingOrdersWidget.tsx') {
    content = content.replace(/orders\.slice\(0, 3\)/g, "orders.slice(0, 2)");
  }

  if (file === 'NotesWidget.tsx') {
    content = content.replace(/recentNotes\.slice\(0, 3\)/g, "recentNotes.slice(0, 2)");
  }
  
  fs.writeFileSync(filePath, content);
}
console.log('Widgets patched');
