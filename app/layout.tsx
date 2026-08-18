import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-context";
const geist=Geist({variable:"--font-geist-sans",subsets:["latin"]});
export const metadata:Metadata={title:"Mobile Nurse Care",description:"Book professional nursing care at home or online.",other:{"codex-preview":"development"},icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" suppressHydrationWarning><body className={geist.variable}><AuthProvider>{children}</AuthProvider></body></html>}
