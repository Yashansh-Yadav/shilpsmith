import "./globals.css";

export const metadata = {
  title: "shilpsmith 3D Studio",
  description: "Premium 3D printed products and custom orders"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}