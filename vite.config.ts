import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({mode})=>({plugins:[react(),tailwindcss(),{name:'private-metadata',transformIndexHtml(html){return mode==='demo'?html:html.replace('<link rel="canonical" href="https://avo42.com/pulse/">','<meta name="robots" content="noindex,nofollow">');}}],build:{sourcemap:false}}));
