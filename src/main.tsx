import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const redirectPath = sessionStorage.getItem('redirect');
if (redirectPath) {
  sessionStorage.removeItem('redirect');
  if (redirectPath !== window.location.pathname) {
    window.history.replaceState(null, '', redirectPath);
  }
}

createRoot(document.getElementById("root")!).render(<App />);