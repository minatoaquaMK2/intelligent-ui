import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import { installStaticDemo } from '../../src/showcase/static-demo';
import '../../src/styles.css';
import '../../src/monitoring.css';

// Only this public entry installs the in-browser transport. The local application
// continues to use its Express API and can connect to a real model provider.
installStaticDemo();
createRoot(document.getElementById('root')!).render(<App />);
