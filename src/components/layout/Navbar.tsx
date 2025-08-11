import { Link } from "react-router-dom"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-lg shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section - Now clickable */}
          <Link to="/" className="flex items-center gap-3 group transition-all duration-200 hover:scale-105">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg group-hover:shadow-xl transition-all duration-200">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Flip Your PDF
              </h1>
              <p className="text-xs text-muted-foreground">Advanced PDF Viewer</p>
            </div>
          </Link>

          {/* Centered Navigation */}
          <nav className="absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-1 bg-muted/50 rounded-full p-1 backdrop-blur-sm">
              <Link
                to="/past-papers"
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                  "hover:bg-background hover:text-foreground hover:shadow-sm",
                  "text-muted-foreground",
                )}
              >
                Past Papers
              </Link>
              {/* Removed Page 2 and Page 3 links */}
            </div>
          </nav>

          {/* Right side spacer to balance the layout */}
          <div className="w-32"></div>
        </div>
      </div>
    </header>
  )
}