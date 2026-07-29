require('module-alias/register');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Mock Zustand store and environment
process.env.VITE_API_URL = 'http://localhost';
jest = { fn: () => {} };

// We need to compile TSX on the fly to run it in Node
require('esbuild-register/dist/node').register();

try {
  const IconPickerModal = require('./src/components/os/IconPickerModal.tsx').default;
  const html = ReactDOMServer.renderToString(React.createElement(IconPickerModal, { appId: 'settings', onClose: () => {} }));
  console.log("Render Success! HTML length:", html.length);
} catch (e) {
  console.error("Render Crash:");
  console.error(e);
}
