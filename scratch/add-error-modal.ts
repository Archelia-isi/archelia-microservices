import fs from 'fs';
let content = fs.readFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', 'utf8');

// Add states
content = content.replace(/const \[quantity, setQuantity\] = useState\(1\);/, "const [quantity, setQuantity] = useState(1);\n  const [showErrorModal, setShowErrorModal] = useState(false);\n  const [errorMessage, setErrorMessage] = useState('');");

// Update error handling
content = content.replace(/alert\(\`Errore: \$\{res.error\}\`\);/, "setErrorMessage(res.error || 'Errore sconosciuto');\n        setShowErrorModal(true);");

// Add modal JSX at the very end before the last closing div
const modalHtml = `
      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowErrorModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden relative" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
            <button 
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-5">
              <h3 className="text-red-600 font-bold text-lg mb-2 text-center">Impossibile Aggiungere</h3>
              <p className="text-sm text-gray-600 text-center">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(/    <\/div>\n  \);\n\}/, `    </div>\n${modalHtml}  );\n}`);

fs.writeFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', content);
