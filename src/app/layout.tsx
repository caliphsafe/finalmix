import type {Metadata} from 'next';
import './globals.css';
export const metadata: Metadata = {title:'FINAL MIX — Audio Engineering by 43DOU',description:'A private audio engineering workspace. Analyze, refine, compare and export your music with real browser-based processing and an optional local studio engine.',robots:{index:true,follow:true}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
