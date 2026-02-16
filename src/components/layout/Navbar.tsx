import { Link } from "react-router-dom"
import { FileText, Sun, Moon, LogIn, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AuthModal } from "@/components/auth/AuthModal"

export const Navbar = () => {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()

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
                letme.study
              </h1>
              <p className="text-xs text-muted-foreground">Smart Study Assistant</p>
            </div>
          </Link>

          {/* Centered Navigation */}
          <nav className="absolute left-1/2 transform -translate-x-1/2 hidden md:block">
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
              <Link
                to="/chat"
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                  "hover:bg-background hover:text-foreground hover:shadow-sm",
                  "text-muted-foreground",
                )}
              >
                Chat
              </Link>
              <Link
                to="/notes"
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                  "hover:bg-background hover:text-foreground hover:shadow-sm",
                  "text-muted-foreground",
                )}
              >
                Notes
              </Link>
            </div>
          </nav>

          {/* Right side - Theme Toggle & Auth */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl h-10 w-10"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-500 transition-all" />
              ) : (
                <Moon className="h-5 w-5 text-blue-600 transition-all" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                      <AvatarFallback>{user.displayName?.charAt(0) || <User className="h-5 w-5" />}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AuthModal>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-opacity gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </AuthModal>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}