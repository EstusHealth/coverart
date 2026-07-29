export const metadata = {
  title: "Estus Social Creator",
  description: "Create branded social media graphics for Estus Health",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Oswald:wght@300;400;500;600;700&family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
