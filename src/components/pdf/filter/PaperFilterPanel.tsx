import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Filter, RotateCcw, Search } from "lucide-react"

// Unchanged
export interface FilterCriteria {
  subject: string[]
  year: string[]
  season: string[]
  paperNumber: string[]
  variantNumber: string[]
}

interface PaperFilterPanelProps {
  options: {
    subjects: string[]
    years: string[]
    seasons: string[]
    paperNumbers: string[]
    variantNumbers: string[]
  }
  onApplyFilter: (filter: FilterCriteria) => void
  initialFilter?: FilterCriteria
  compact?: boolean
}

const initialFilterState: FilterCriteria = {
  subject: [],
  year: [],
  season: [],
  paperNumber: [],
  variantNumber: [],
}

const seasonMap: Record<string, string> = {
  s: 'Summer (May/June)',
  w: 'Winter (Oct/Nov)',
  m: 'March',
};

// UPDATED: FilterSection component with simplified checkbox logic
const FilterSection = ({ title, items, selectedItems, onSelectionChange, onToggleAll, searchable = false }: {
  title: string
  items: { value: string, label: string }[]
  selectedItems: string[]
  onSelectionChange: (value: string) => void
  onToggleAll: () => void
  searchable?: boolean
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const filteredItems = useMemo(() =>
    items.filter(item => item.label.toLowerCase().includes(searchTerm.toLowerCase())),
    [items, searchTerm]
  )

  // Simplified logic to remove the "indeterminate" state.
  // The checkbox is only checked if ALL items are selected.
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  return (
    <div className="space-y-3">
      <Label className="font-semibold">{title}</Label>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`all-${title}`}
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
          />
          <Label htmlFor={`all-${title}`} className="cursor-pointer font-semibold text-primary">
            Select All
          </Label>
        </div>
        <Separator />
        <ScrollArea className="h-32 pr-3">
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div key={item.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${title}-${item.value}`}
                  checked={selectedItems.includes(item.value)}
                  onCheckedChange={() => onSelectionChange(item.value)}
                />
                <Label htmlFor={`${title}-${item.value}`} className="cursor-pointer font-normal">
                  {item.label}
                </Label>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No matches found.</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}


export const PaperFilterPanel = ({ 
  options, 
  onApplyFilter, 
  initialFilter = initialFilterState,
  compact = false 
}: PaperFilterPanelProps) => {
  const [currentFilter, setCurrentFilter] = useState<FilterCriteria>(initialFilter)

  const handleSelectionChange = (field: keyof FilterCriteria, value: string) => {
    setCurrentFilter(prev => {
      const newValues = prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
      return { ...prev, [field]: newValues }
    })
  }
  
  const handleToggleAll = (field: keyof FilterCriteria) => {
    setCurrentFilter(prev => {
      const optionKeyMap: Record<keyof FilterCriteria, keyof PaperFilterPanelProps['options']> = {
        subject: 'subjects',
        year: 'years',
        season: 'seasons',
        paperNumber: 'paperNumbers',
        variantNumber: 'variantNumbers',
      };
      
      const allValues = options[optionKeyMap[field]];
      const isAllSelected = prev[field].length === allValues.length;

      return {
          ...prev,
          [field]: isAllSelected ? [] : [...allValues],
      };
    });
  };

  const handleApply = () => { onApplyFilter(currentFilter) }
  const handleReset = () => { setCurrentFilter(initialFilterState) }

  const sortedYears = useMemo(() => options.years.sort((a, b) => parseInt(b) - parseInt(a)), [options.years]);

  const filterSections = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FilterSection
        title="Subject"
        items={options.subjects.map(s => ({ value: s, label: s }))}
        selectedItems={currentFilter.subject}
        onSelectionChange={(value) => handleSelectionChange('subject', value)}
        onToggleAll={() => handleToggleAll('subject')}
        searchable
      />
      <FilterSection
        title="Year"
        items={sortedYears.map(y => ({ value: y, label: y }))}
        selectedItems={currentFilter.year}
        onSelectionChange={(value) => handleSelectionChange('year', value)}
        onToggleAll={() => handleToggleAll('year')}
        searchable
      />
      <FilterSection
        title="Season"
        items={options.seasons.map(s => ({ value: s, label: seasonMap[s] || s }))}
        selectedItems={currentFilter.season}
        onSelectionChange={(value) => handleSelectionChange('season', value)}
        onToggleAll={() => handleToggleAll('season')}
      />
      <FilterSection
        title="Paper Number"
        items={options.paperNumbers.map(p => ({ value: p, label: `Paper ${p}` }))}
        selectedItems={currentFilter.paperNumber}
        onSelectionChange={(value) => handleSelectionChange('paperNumber', value)}
        onToggleAll={() => handleToggleAll('paperNumber')}
      />
      <FilterSection
        title="Variant Number"
        items={options.variantNumbers.map(v => ({ value: v, label: `Variant ${v}` }))}
        selectedItems={currentFilter.variantNumber}
        onSelectionChange={(value) => handleSelectionChange('variantNumber', value)}
        onToggleAll={() => handleToggleAll('variantNumber')}
      />
    </div>
  );

  const actionButtons = (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={handleReset}>
        <RotateCcw className="mr-2 h-4 w-4" /> Reset
      </Button>
      <Button onClick={handleApply}>
        <Search className="mr-2 h-4 w-4" /> Apply Filter
      </Button>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-6">
        {filterSections}
        {actionButtons}
      </div>
    )
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Filter className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Find Specific Papers</CardTitle>
            <CardDescription>Select multiple options to narrow down your search.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filterSections}
        <div className="mt-8">
          {actionButtons}
        </div>
      </CardContent>
    </Card>
  )
}