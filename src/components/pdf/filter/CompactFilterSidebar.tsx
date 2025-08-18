import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Filter, RotateCcw } from "lucide-react"
import { PaperFilterPanel, type FilterCriteria } from "./PaperFilterPanel"

interface CompactFilterSidebarProps {
  options: {
    subjects: string[]
    years: string[]
    seasons: string[]
    paperNumbers: string[]
    variantNumbers: string[]
  }
  activeFilter: FilterCriteria
  onApplyFilter: (filter: FilterCriteria) => void
  onClearFilter: () => void
}

export const CompactFilterSidebar = ({ 
  options, 
  activeFilter, 
  onApplyFilter, 
  onClearFilter 
}: CompactFilterSidebarProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const activeFilterCount = Object.values(activeFilter).reduce(
    (count, values) => count + values.length, 
    0
  )

  const handleApplyFilter = (filter: FilterCriteria) => {
    onApplyFilter(filter)
    setIsDialogOpen(false)
  }

  const handleClearFilter = () => {
    onClearFilter()
    setIsDialogOpen(false)
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm border h-fit">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} Active
            </Badge>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Filter className="h-4 w-4" />
              <span>Find Papers</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Find Specific Papers</DialogTitle>
            </DialogHeader>
            <PaperFilterPanel 
              options={options} 
              onApplyFilter={handleApplyFilter}
              initialFilter={activeFilter}
              compact
            />
          </DialogContent>
        </Dialog>

        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilter}
            className="w-full text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </CardContent>
    </Card>
  )
}