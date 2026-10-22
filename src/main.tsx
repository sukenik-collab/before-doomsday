import { render } from 'preact';
import '@fontsource/archivo-narrow/latin-500.css';
import '@fontsource/archivo-narrow/latin-600.css';
import '@fontsource/archivo-narrow/latin-700.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/source-serif-4/latin-400-italic.css';
import './styles.css';
import { App } from './ui/App';
import { initAnalytics } from './analytics';

initAnalytics();
render(<App />, document.getElementById('app')!);
