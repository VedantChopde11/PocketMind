import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import {ConvexClientProvider} from "@/components/Convex-client-provider"
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({subsets:["latin"]})

export const metadata = {
  title: "PocketMind",
  description: "Your Financial Brain in Your Pocket.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
    >
      <body className={`${inter.className}`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <Header/>
            <main className="min-h-screen">
              {children}
              <Toaster />
            </main>
          </ConvexClientProvider> 
        </ClerkProvider>
      </body>
    </html>
  );
}
