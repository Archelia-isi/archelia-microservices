const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = [
  'src/components/os/widgets/CalendarWidget.tsx',
  'src/components/os/widgets/CopywriterWidget.tsx',
  'src/components/os/widgets/FinanceWidget.tsx',
  'src/components/os/widgets/KpiWidget.tsx',
  'src/components/os/widgets/MonitorWidget.tsx',
  'src/components/os/widgets/NotesWidget.tsx',
  'src/components/os/widgets/PendingOrdersWidget.tsx',
  'src/components/os/widgets/ShopifySalesWidget.tsx',
  'src/components/os/widgets/TranslatorWidget.tsx',
  'src/pages/CalendarApp.tsx',
  'src/pages/NotesApp.tsx'
];

for (const f of files) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf-8');
    content = content.replace(/import \{ useAuthStore \} from '.*useAuthStore';\n/g, '');
    content = content.replace(/const \{ token \} = useAuthStore\(\);/g, "const token = localStorage.getItem('token');");
    // fix React is declared but its value is never read
    if (f.includes('CalendarApp') || f.includes('NotesApp')) {
       content = content.replace(/import React(?:, \{[^}]+\})? from 'react';/, "import { useState, useEffect } from 'react';");
    }
    fs.writeFileSync(p, content, 'utf-8');
    console.log('Fixed', p);
  }
}
