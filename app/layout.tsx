import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
  style={{
    backgroundImage: "url('/ui/bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {children}
</body>
    </html>
  );
}
