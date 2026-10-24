import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { DivisionProvider } from '@/contexts/companydivision.context';
import { PrivilegeProvider } from '@/contexts/userPrivilege.context';
import { AuthProvider } from '@/contexts/auth.context';
import { DynamicTitle } from '@/components/common/DynamicTitle';
import { ThemeProvider } from '@/components/theme-wrapper';
import { GoogleOAuthProvider } from '@react-oauth/google';

export const metadata: Metadata = {
  title: 'Synlio',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
    <head>
      {/* Inline script to restore color before paint */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function(){try{
            var c = localStorage.getItem('primary-color');
            if (c && c !== 'default' && c !== 'null' && c !== 'undefined') {
              document.documentElement.style.setProperty('--primary', c);
            }
          }catch(e){}})();
          `,
        }}
      />
      <title>Synlio</title>
    </head>
    <body className={`antialiased`} suppressHydrationWarning>
    <GoogleOAuthProvider clientId="395673281133-fpmhgpvhv9ichte6bjai079ne0tnh1n4.apps.googleusercontent.com">
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main>
        <AuthProvider>
            <DynamicTitle />
            <PrivilegeProvider>
              <DivisionProvider>{children}</DivisionProvider>
            </PrivilegeProvider>
            <Toaster position="bottom-right" closeButton />
        </AuthProvider>
      </main>
    </ThemeProvider>
    </GoogleOAuthProvider>
    </body>
    </html>
  );
}