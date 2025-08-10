import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming utils.ts has a cn function for tailwind-merge

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Flip Your PDF</h1>
            <p className="text-xs text-muted-foreground">
              Advanced PDF Viewer
            </p>
          </div>
        </div>
        <nav className="flex items-center space-x-6">
          <Link
            to="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              // Add active class styling if desired based on current path
            )}
          >
            Home
          </Link>
          <Link
            to="/past-papers"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
            )}
          >
            Past Papers
          </Link>
        </nav>
      </div>
    </header>
  );
};