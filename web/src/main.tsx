import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';
import { installCspSafeStyles } from './demoCsp.ts';
import { DEMO } from './workbench.ts';

if (DEMO) installCspSafeStyles();
createRoot(document.getElementById('root')!).render(<App />);
