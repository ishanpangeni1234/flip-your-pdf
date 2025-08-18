import { useMemo } from "react"
import { BookOpen, SearchX } from "lucide-react"
import type { PaperSet, LinkClickHandler } from "@/pages/PastPapers"
import type { FilterCriteria } from "./PaperFilterPanel"
import { PaperCard } from "@/pages/PastPapers"
import { EmptyState } from "@/pages/PastPapers"

interface FilteredResultsProps {
  allPapers: PaperSet[]
  activeFilter: FilterCriteria
  onLinkClick: LinkClickHandler
}

export const FilteredResults = ({ allPapers, activeFilter, onLinkClick }: FilteredResultsProps) => {
  const filteredPapers = useMemo(() => {
    return allPapers.filter(paper => {
      if (activeFilter.subject.length > 0 && !activeFilter.subject.includes(paper.subject)) return false
      if (activeFilter.year.length > 0 && !activeFilter.year.includes(paper.year.toString())) return false
      if (activeFilter.season.length > 0 && !activeFilter.season.includes(paper.season)) return false
      if (activeFilter.paperNumber.length > 0 && !activeFilter.paperNumber.includes(paper.paperNumber.toString())) return false
      if (activeFilter.variantNumber.length > 0 && !activeFilter.variantNumber.includes(paper.variantNumber.toString())) return false
      return true
    })
  }, [allPapers, activeFilter])

  const groupedBySubject = useMemo(() => {
    return filteredPapers.reduce<Record<string, PaperSet[]>>((acc, paper) => {
      const key = `${paper.subject} - ${paper.session} - ${paper.year}`
      if (!acc[key]) acc[key] = []
      acc[key].push(paper)
      return acc
    }, {})
  }, [filteredPapers])

  const sortedGroupKeys = Object.keys(groupedBySubject).sort((a, b) => b.localeCompare(a)); // Sort by Year (desc) then session/subject

  if (filteredPapers.length === 0) {
    return (
        <EmptyState
            icon={SearchX}
            title="No Papers Found"
            message="No papers match your current filter criteria. Try adjusting or clearing your filter."
        />
    )
  }

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight"> {/* Changed text-3xl to text-xl */}
          Found {filteredPapers.length} Matching Paper{filteredPapers.length !== 1 ? 's' : ''}
        </h2>
        {/* Removed the <p> tag that contained the text */}
      </div>
      <div className="space-y-12 max-w-7xl mx-auto">
        {sortedGroupKeys.map(groupKey => {
            const papersInGroup = groupedBySubject[groupKey];
            const groupName = papersInGroup[0].series.match(/^(Paper\s+\d+)/)?.[1] || "Variants";

            return (
                <div key={groupKey}>
                    <h3 className="text-2xl font-semibold mb-6 border-b pb-4 flex items-center gap-3">
                        <BookOpen className="h-6 w-6 text-primary" />
                        {groupKey}
                    </h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {papersInGroup.map((paper) => (
                            <PaperCard
                                key={paper.id}
                                paper={paper}
                                groupName={groupName}
                                onLinkClick={onLinkClick}
                            />
                        ))}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  )
}