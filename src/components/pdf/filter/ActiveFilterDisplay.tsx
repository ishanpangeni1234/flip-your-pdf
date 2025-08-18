import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import type { FilterCriteria } from "./PaperFilterPanel"

interface ActiveFilterDisplayProps {
  activeFilter: FilterCriteria
  onClearFilter: () => void
  onRemoveFilter: (key: keyof FilterCriteria, value: string) => void
}

// Maps filter keys to human-readable labels
const filterLabels: Record<keyof FilterCriteria, string> = {
  subject: "Subject",
  year: "Year",
  season: "Season",
  paperNumber: "Paper",
  variantNumber: "Variant",
}

// Maps season codes to full names for display
const seasonMap: Record<string, string> = {
  s: "Summer",
  w: "Winter",
  m: "March",
};

export const ActiveFilterDisplay = ({
  activeFilter,
  onClearFilter,
  onRemoveFilter,
}: ActiveFilterDisplayProps) => {
  // Get keys that have at least one filter value selected
  const activeKeys = (Object.keys(activeFilter) as Array<keyof FilterCriteria>)
    .filter(key => activeFilter[key] && activeFilter[key].length > 0)

  // If no filters are active, don't render anything
  if (activeKeys.length === 0) return null

  return (
    // By adding `w-fit`, the card will now shrink to the width of its content.
    <Card className="w-fit mb-6 bg-gradient-to-br from-card/70 to-card/50 backdrop-blur-sm animate-in fade-in-50 duration-300 border">
      {/* The inner flex container will now work as expected within the smaller card */}
      <CardContent className="p-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold mr-2 text-muted-foreground">Filters:</span>
          
          {/* Map over each active filter *type* (e.g., 'year', 'season') */}
          {activeKeys.map(key => {
            const values = activeFilter[key]
            
            // Apply the season map if the key is 'season', otherwise use the value as is.
            // Then join all values with a comma for a compact display.
            const displayValues = values
              .map(value => (key === 'season' ? seasonMap[value] || value : value))
              .join(', ')

            // Handler to remove the entire group of filters for a specific key
            const handleRemoveGroup = () => {
              values.forEach(value => onRemoveFilter(key, value))
            }

            return (
              <Badge key={key} variant="secondary" className="py-1 px-2.5 group">
                <span className="font-normal text-muted-foreground mr-1.5">{filterLabels[key]}:</span>
                <span className="font-semibold">{displayValues}</span>
                <button
                  onClick={handleRemoveGroup}
                  className="ml-2 rounded-full opacity-60 group-hover:opacity-100 group-hover:bg-destructive/20 p-0.5 transition-colors"
                  aria-label={`Remove all ${filterLabels[key]} filters`}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove {filterLabels[key]} filter group</span>
                </button>
              </Badge>
            )
          })}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearFilter} 
          className="flex-shrink-0 h-8 px-2"
        >
          <X className="mr-1.5 h-4 w-4" />
          Clear All
        </Button>
      </CardContent>
    </Card>
  )
}