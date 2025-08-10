import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background patterns are intentionally kept on specific pages if they are unique to them,
          otherwise, they can be moved here for global application.
          For this setup, the Index page's background will remain on that page. */}
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};