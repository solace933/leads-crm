import './globals.css';

export const metadata = {
  title: 'Lead pipeline',
  description: 'Personal lead tracker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
