import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import './styles/blocknote-custom.css';

const root = createRoot(document.getElementById('root')!);

root.render(<App />);


