import React from 'react';
import {createRoot} from 'react-dom/client';
import Dashboard from './dashboard';
import './style.css';
const demo=import.meta.env.MODE==='demo';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{demo&&<header className="demoheader"><div><strong>Plotwake</strong><p>A morning check for everything you ship.</p></div><div><a href="#main-content">Explore the demo ↓</a><a href="https://github.com/matt-warchol/plotwake" target="_blank" rel="noreferrer">Get the source ↗</a><a href="https://avo42.com/" target="_blank" rel="noreferrer">By avo42</a></div></header>}<Dashboard publicDemo={demo}/></React.StrictMode>);
