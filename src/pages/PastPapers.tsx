"use client"
import { useState, useCallback, useMemo, useEffect } from "react"
import type React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"

import { Layout } from "@/components/layout/Layout"
import { PDFViewer } from "@/components/pdf/PDFViewer"
import { Button, ButtonProps } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  FileText, ClipboardList, CheckSquare, ChevronRight, Home, BookOpen, Calendar,
  ArrowLeft, Eye, GraduationCap, Clock, FileX, BarChart3, PenSquare,
  LucideProps, BookCopy, SearchX,
} from "lucide-react"

import { type FilterCriteria } from "@/components/pdf/filter/PaperFilterPanel"
import { CompactFilterSidebar } from "@/components/pdf/filter/CompactFilterSidebar"
import { ActiveFilterDisplay } from "@/components/pdf/filter/ActiveFilterDisplay"
import { FilteredResults } from "@/components/pdf/filter/FilteredResults"

import allPapersData from "@/data/papers.json"

interface PDFFileData {
  name: string
  path: string
}
export interface PaperSet {
  id: string
  series: string
  subject: string
  year: number
  session: string
  season: string
  paperNumber: number
  variantNumber: number
  qp: PDFFileData | null
  ms: PDFFileData | null
  in: PDFFileData | null
}
interface YearData {
  sessionDocs: {
    er: PDFFileData | null
    gt: PDFFileData | null
  }
  paperList: PaperSet[]
}
type PapersData = {
  [subject: string]: { [session: string]: { [year: string]: YearData } }
}

type DocViewType = 'qp' | 'ms' | 'in' | 'er' | 'gt';
export type LinkClickHandler = (e: React.MouseEvent<HTMLAnchorElement>, pdf: PDFFileData | null, type: DocViewType, paperSet: PaperSet) => void;

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const findKeyBySlug = (obj: object, slug: string) => Object.keys(obj).find(key => slugify(key) === slug);

const FileButton = ({
  pdf,
  icon: Icon,
  label,
  onLinkClick,
  className,
  colorScheme = "gray",
}: {
  pdf: PDFFileData | null
  icon: React.ElementType<LucideProps>
  label: string
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, pdf: PDFFileData | null) => void;
  colorScheme?: "blue" | "green" | "purple" | "orange" | "indigo" | "gray"
} & ButtonProps) => {

  const colorStyles = {
    blue: "text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/30",
    green: "text-green-600 dark:text-green-400 border-green-500/20 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/30",
    purple: "text-purple-600 dark:text-purple-400 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/30",
    orange: "text-orange-600 dark:text-orange-400 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/30",
    indigo: "text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/30",
    gray: "text-gray-600 dark:text-gray-400 border-gray-500/20 bg-gray-500/5 hover:bg-gray-500/10 hover:border-gray-500/30",
  }

  if (!pdf) {
    return (
      <Button className="w-full justify-between opacity-60 bg-transparent" variant="outline" disabled>
        <div className="flex items-center gap-2">
          <FileX className="h-4 w-4" /> <span>{label}</span>
        </div>
        <span className="text-xs">Not Available</span>
      </Button>
    )
  }

  return (
    <Button asChild variant="outline" className={`w-full justify-between group transition-all duration-200 border-2 ${className} ${colorStyles[colorScheme]}`}>
      <a href={pdf.path} onClick={(e) => onLinkClick(e, pdf)} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" /> <span className="font-semibold">{label}</span>
        </div>
        <Eye className="h-4 w-4 opacity-70 group-hover:scale-110 group-hover:opacity-100 transition-transform" />
      </a>
    </Button>
  )
}

export const PaperCard = ({ paper, groupName, onLinkClick }: { paper: PaperSet; groupName: string; onLinkClick: LinkClickHandler }) => (
  <Card className="flex flex-col bg-card/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 border hover:border-primary/30 hover:-translate-y-1">
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BookCopy className="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-md font-bold">{paper.series.replace(groupName, "").trim() || "Main Variant"}</CardTitle>
          <CardDescription className="text-xs">{paper.id}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-2 flex-grow flex flex-col justify-end p-4 pt-2">
      <FileButton pdf={paper.qp} icon={FileText} label="Question Paper" onLinkClick={(e, pdf) => onLinkClick(e, pdf, 'qp', paper)} colorScheme="blue" />
      <FileButton pdf={paper.ms} icon={CheckSquare} label="Mark Scheme" onLinkClick={(e, pdf) => onLinkClick(e, pdf, 'ms', paper)} colorScheme="green" />
      {paper.in && <FileButton pdf={paper.in} icon={ClipboardList} label="Insert" onLinkClick={(e, pdf) => onLinkClick(e, pdf, 'in', paper)} colorScheme="purple" />}
    </CardContent>
  </Card>
)

const SessionDocuments = ({ er, gt, onLinkClick, subject, session, year }: { er: PDFFileData | null; gt: PDFFileData | null; onLinkClick: LinkClickHandler, subject: string, session: string, year: string }) => {
  if (!er && !gt) return null
  const dummyPaperSet: PaperSet = { id: 'session-docs', series: 'Session Documents', subject, session, year: parseInt(year), season: 's', paperNumber: 0, variantNumber: 0, qp: null, ms: null, in: null };
  return (
    <Card className="max-w-4xl mx-auto p-6 bg-card/60 backdrop-blur-sm border-2 border-dashed">
       <h3 className="text-xl font-semibold mb-4 text-center">Session Documents</h3>
       <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {er && <FileButton pdf={er} icon={PenSquare} label="Examiner Report" onLinkClick={(e, pdf) => onLinkClick(e, pdf, 'er', dummyPaperSet)} colorScheme="orange" />}
        {gt && <FileButton pdf={gt} icon={BarChart3} label="Grade Thresholds" onLinkClick={(e, pdf) => onLinkClick(e, pdf, 'gt', dummyPaperSet)} colorScheme="indigo" />}
      </div>
    </Card>
  )
}

export const EmptyState = ({ icon: Icon, title, message }: { icon: React.ElementType<LucideProps>; title: string; message: string }) => (
  <div className="text-center py-16 bg-card/50 rounded-xl border">
    <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
      <Icon className="h-12 w-12 text-primary" />
    </div>
    <h3 className="text-2xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-md mx-auto">{message}</p>
  </div>
)

const Breadcrumbs = ({ steps, onNavigate }: { steps: string[]; onNavigate: (index: number) => void }) => (
  <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-2.5">
    <nav className="flex items-center space-x-1 text-sm">
      <button onClick={() => onNavigate(0)} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors font-medium">
        <Home className="h-4 w-4" /> Past Papers
      </button>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => onNavigate(index + 1)}
            className={`px-3 py-1.5 rounded-md transition-colors ${ index === steps.length - 1 ? "bg-primary text-primary-foreground font-semibold shadow-sm" : "hover:bg-muted"}`}
            disabled={index === steps.length - 1}
          >
            {step}
          </button>
        </div>
      ))}
    </nav>
  </div>
)

const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card p-8 rounded-xl shadow-2xl border flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="text-center">
          <h3 className="text-xl font-semibold">Loading Paper</h3>
          <p className="text-sm text-muted-foreground">Please wait, your document is being prepared...</p>
        </div>
      </div>
    </div>
)

const SessionSelector = ({ subject, sessions, onSelectSession }: { subject: string; sessions: string[]; onSelectSession: (session: string) => void }) => (
  <Card
    className="group relative flex flex-col justify-center items-center overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer min-h-[220px] bg-card/60 backdrop-blur-sm"
  >
     <div className="transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:-translate-y-4 w-full text-center p-4 flex flex-col items-center justify-center">
        <div className="mx-auto mb-3 p-4 bg-primary/10 rounded-full w-fit group-hover:scale-110 transition-transform duration-300">
            <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{subject}</h3>
        <p className="text-xs text-muted-foreground mt-1">Click to select a session</p>
     </div>
     <div className="absolute inset-0 p-3 flex flex-col items-center justify-center transition-all duration-500 ease-in-out opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-4 pointer-events-none group-hover:pointer-events-auto">
        <h4 className="text-base font-semibold mb-3 text-primary">Select Session</h4>
        {sessions.length > 0 ? (
          <div className="space-y-1.5 w-full max-w-[85%] mx-auto">
            {sessions.map((session) => (
              <Button key={session} variant="ghost" className="w-full flex justify-between items-center p-2 h-auto hover:bg-primary/10" onClick={() => onSelectSession(session)}>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span className="font-medium text-sm">{session}</span></div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </Button>
            ))}
          </div>
        ) : (<p className="text-xs text-muted-foreground text-center px-4">No sessions available.</p>)}
     </div>
  </Card>
)

const YearCard = ({ year, onClick }: { year: string; onClick: () => void }) => (
    <motion.div
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300 }}
    >
        <Card onClick={onClick} className="group cursor-pointer bg-card/60 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/40 transition-colors duration-200">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Clock className="h-8 w-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-2xl font-bold text-card-foreground group-hover:text-primary transition-colors">{year}</p>
            </CardContent>
        </Card>
    </motion.div>
);

const initialFilter: FilterCriteria = {
  subject: [], year: [], season: [], paperNumber: [], variantNumber: [],
}

const PastPapers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subject: subjectSlug, session: sessionSlug, year: selectedYear } = useParams<{ subject: string; session: string; year: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<FilterCriteria>(initialFilter);

  const viewId = searchParams.get('view');
  const viewType = searchParams.get('type') as DocViewType | null;
  const [loadedPdfData, setLoadedPdfData] = useState<{ set: PaperSet; initialFile: File; initialFileType: DocViewType; } | null>(null);

  const papers: PapersData = allPapersData;
  const subjects = Object.keys(papers);

  const { allPapersList, filterOptions } = useMemo(() => {
    const list: PaperSet[] = [];
    Object.values(papers).forEach(subjectData => {
      Object.values(subjectData).forEach(sessionData => {
        Object.values(sessionData).forEach(yearData => {
          list.push(...yearData.paperList);
        });
      });
    });

    const options = {
      subjects: [...new Set(list.map(p => p.subject))].sort(),
      years: [...new Set(list.map(p => p.year.toString()))].sort(),
      seasons: [...new Set(list.map(p => p.season))].sort(),
      paperNumbers: [...new Set(list.map(p => p.paperNumber.toString()))].sort((a,b) => parseInt(a) - parseInt(b)),
      variantNumbers: [...new Set(list.map(p => p.variantNumber.toString()))].sort((a,b) => parseInt(a) - parseInt(b)),
    };
    return { allPapersList: list, filterOptions: options };
  }, [papers]);

  useEffect(() => { window.scrollTo(0, 0); }, [subjectSlug, sessionSlug, selectedYear, activeFilter]);

  const selectedSubject = useMemo(() => { if (!subjectSlug) return null; return findKeyBySlug(papers, subjectSlug) || null; }, [subjectSlug, papers]);
  const selectedSession = useMemo(() => { if (!selectedSubject || !sessionSlug) return null; return findKeyBySlug(papers[selectedSubject], sessionSlug) || null; }, [selectedSubject, sessionSlug, papers]);

  const isFiltering = useMemo(() => (Object.values(activeFilter) as string[][]).some(v => v.length > 0), [activeFilter]);

  useEffect(() => {
    const loadPdfFromUrl = async () => {
      if (!viewId || !viewType) { setLoadedPdfData(null); return; }

      const isReadyToLoad = viewId && viewType && (isFiltering || (selectedSubject && selectedSession && selectedYear));
      if (!isReadyToLoad) { setLoadedPdfData(null); return; }

      setIsLoading(true);
      try {
        let paperSetToView: PaperSet | null | undefined = null;
        let pdfData: PDFFileData | null = null;
        let yearData;

        if (selectedSubject && selectedSession && selectedYear) {
            yearData = papers[selectedSubject]?.[selectedSession]?.[selectedYear];
        }

        if (viewId === 'session-docs') {
            if (!yearData) throw new Error("Could not find data for the selected year for session docs.");
            paperSetToView = { id: 'session-docs', series: 'Session Documents', subject: selectedSubject!, session: selectedSession!, year: parseInt(selectedYear!), season: 's', paperNumber: 0, variantNumber: 0, qp: null, ms: null, in: null };
            pdfData = viewType === 'er' ? yearData.sessionDocs.er : viewType === 'gt' ? yearData.sessionDocs.gt : null;
        } else {
            paperSetToView = allPapersList.find(p => p.id === viewId);
            if(paperSetToView) {
                pdfData = paperSetToView[viewType as 'qp' | 'ms' | 'in'] || null;
            }
        }

        if (!paperSetToView) throw new Error("Could not find the specified paper set.");
        if (!pdfData) throw new Error("Could not find the specified PDF data.");

        toast({ title: "Loading PDF...", description: `Fetching ${pdfData.name}` });
        const response = await fetch(pdfData.path);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        const file = new File([await response.blob()], pdfData.name, { type: "application/pdf" });
        setLoadedPdfData({ set: paperSetToView, initialFile: file, initialFileType: viewType });
        toast({ title: "Success!", description: "PDF loaded successfully", variant: "default" });
      } catch (error) {
        console.error("Error loading PDF from URL:", error);
        toast({ title: "Error", description: "Could not load the selected PDF.", variant: "destructive" });
        setSearchParams({}, { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    loadPdfFromUrl();
  }, [viewId, viewType, selectedSubject, selectedSession, selectedYear, papers, toast, setSearchParams, isFiltering, allPapersList]);

  const handleSelectSession = (subject: string, session: string) => { navigate(`/past-papers/${slugify(subject)}/${slugify(session)}`); }
  const handleSelectYear = (year: string) => { navigate(`/past-papers/${subjectSlug}/${sessionSlug}/${year}`); }
  const handleBack = () => navigate(-1);

  const handleBreadcrumbNavigate = (index: number) => {
    setActiveFilter(initialFilter);
    if (index === 0) { navigate('/past-papers'); }
    else if (index === 1 && subjectSlug && sessionSlug) { navigate(`/past-papers/${subjectSlug}/${sessionSlug}`); }
  }

  const handleLinkClick: LinkClickHandler = (e, pdf, type, paperSet) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (!pdf) return;
    setSearchParams({ view: paperSet.id, type: type });
  };

  const handleCloseViewer = useCallback(() => { setSearchParams({}); }, [setSearchParams]);

  const handleApplyFilter = (filter: FilterCriteria) => {
    if ((Object.values(filter) as string[][]).some(v => v.length > 0)) {
        navigate('/past-papers', { replace: true });
    }
    setActiveFilter(filter);
  }
  const handleClearFilter = () => { setActiveFilter(initialFilter); }

  const handleRemoveFilter = (key: keyof FilterCriteria, value: string) => {
    setActiveFilter(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value),
    }));
  };

  if (viewId && loadedPdfData) {
    return ( <PDFViewer initialFile={loadedPdfData.initialFile} paperSet={loadedPdfData.set} initialFileType={loadedPdfData.initialFileType as any} onClose={handleCloseViewer} /> );
  }

  const renderContent = () => {
    const animationVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };

    const currentView = selectedYear ? "papers" : selectedSession ? "years" : "subjects";
    if ((subjectSlug && !selectedSubject) || (sessionSlug && !selectedSession)) { return ( <EmptyState icon={SearchX} title="Content Not Found" message="The page you are looking for does not exist. It might have been moved, or the link is incorrect." /> ); }

    if (currentView !== 'subjects' && !isFiltering) {
      return (
        <AnimatePresence mode="wait">
            <motion.div key={currentView} initial="hidden" animate="visible" exit="exit" variants={animationVariants} transition={{ duration: 0.3 }}>
                {(() => {
                    switch (currentView) {
                        case "years": {
                            const years = selectedSubject && selectedSession ? Object.keys(papers[selectedSubject][selectedSession]).sort((a, b) => Number.parseInt(b) - Number.parseInt(a)) : []
                            return (
                                <div className="space-y-10">
                                    <div className="text-center">
                                        <h2 className="text-3xl font-bold tracking-tight mb-2">Select Year</h2>
                                        <p className="text-muted-foreground text-lg">For {selectedSubject} - {selectedSession}</p>
                                    </div>
                                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-w-6xl mx-auto">
                                        {years.map((year) => (
                                            <YearCard key={year} year={year} onClick={() => handleSelectYear(year)} />
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                        case "papers": {
                            const yearData = selectedSubject && selectedSession && selectedYear ? papers[selectedSubject][selectedSession][selectedYear] : { sessionDocs: { er: null, gt: null }, paperList: [] }
                            const { sessionDocs, paperList } = yearData

                            const groupedPapers = paperList.reduce<Record<string, PaperSet[]>>((acc, paper) => {
                                const groupName = paper.series.match(/^(Paper\s+\d+)/)?.[1] || "Uncategorized Papers"
                                if (!acc[groupName]) acc[groupName] = []
                                acc[groupName].push(paper); return acc
                            }, {})

                            Object.values(groupedPapers).forEach((group) => group.sort((a, b) => a.series.localeCompare(b.series)))
                            const sortedGroupNames = Object.keys(groupedPapers).sort((a, b) => (Number.parseInt(a.replace(/\D/g, "")) || 999) - (Number.parseInt(b.replace(/\D/g, "")) || 999))

                            return (
                                <div className="space-y-12">
                                    <div className="text-center">
                                        <h2 className="text-4xl font-extrabold tracking-tighter mb-2">Available Papers</h2>
                                        <p className="text-muted-foreground text-xl">{selectedSubject} • {selectedSession} • {selectedYear}</p>
                                    </div>
                                    <SessionDocuments er={sessionDocs.er} gt={sessionDocs.gt} onLinkClick={handleLinkClick} subject={selectedSubject!} session={selectedSession!} year={selectedYear!} />
                                    {paperList.length > 0 ? (
                                        <div className="space-y-12 max-w-7xl mx-auto">
                                            {sortedGroupNames.map((groupName) => (
                                                <div key={groupName}>
                                                    <h3 className="text-2xl font-semibold mb-6 border-b pb-4 flex items-center gap-3"><BookOpen className="h-6 w-6 text-primary" />{groupName}</h3>
                                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                        {groupedPapers[groupName].map((paper) => (<PaperCard key={paper.id} paper={paper} groupName={groupName} onLinkClick={handleLinkClick} />))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (<EmptyState icon={FileX} title="No Papers Found" message="No papers are available for this selection. Please try a different year or session." />)}
                                </div>
                            )
                        }
                    }
                })()}
            </motion.div>
        </AnimatePresence>
      )
    }

    // Main landing page with filter header (left) and title (right), subjects below
    return (
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-1 lg:sticky top-24 self-start max-w-xs w-full">
            <CompactFilterSidebar 
              options={filterOptions} 
              activeFilter={activeFilter}
              onApplyFilter={handleApplyFilter}
              onClearFilter={handleClearFilter}
            />
          </div>
          <div className="lg:col-span-1 flex items-center justify-center pt-2 text-center">
            <div className="flex items-center gap-4">
              <div className="inline-block p-3 bg-primary/10 rounded-2xl">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tighter whitespace-nowrap leading-tight pb-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Past Papers Navigator
              </h1>
            </div>
          </div>
          <div className="hidden lg:block" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={isFiltering ? 'filtered-results' : 'subject-browser'}
            initial="hidden" animate="visible" exit="exit" variants={animationVariants} transition={{ duration: 0.3 }}
          >
            {isFiltering ? (
              <div className="space-y-6">
                <ActiveFilterDisplay activeFilter={activeFilter} onClearFilter={handleClearFilter} onRemoveFilter={handleRemoveFilter} />
                <FilteredResults allPapers={allPapersList} activeFilter={activeFilter} onLinkClick={handleLinkClick} />
              </div>
            ) : (
              <div className="space-y-8">
                {subjects.length > 0 ? (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {subjects.map((subject) => (
                      <SessionSelector
                        key={subject}
                        subject={subject}
                        sessions={Object.keys(papers[subject])}
                        onSelectSession={(session) => handleSelectSession(subject, session)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="max-w-2xl mx-auto border-destructive/50 bg-destructive/5">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-4 bg-destructive/10 rounded-full w-fit"><FileX className="h-12 w-12 text-destructive" /></div>
                      <CardTitle className="text-destructive text-2xl">Database is Empty</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground text-center">We couldn't find any paper data. Please check the following:</p>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />Ensure PDF files are in <code className="bg-muted px-1.5 py-0.5 rounded-md text-xs">public/Past Paper/[Subject]/...</code></li>
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />Run <code className="bg-muted px-1.5 py-0.5 rounded-md text-xs">node scripts/generate-paper-data.js</code> to create the data file.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  const breadcrumbSteps = [];
  if (selectedSubject && selectedSession) {
    breadcrumbSteps.push(`${selectedSubject}-${selectedSession}`);
    if (selectedYear) {
      breadcrumbSteps.push(selectedYear);
    }
  }

  const isBrowsing = !isFiltering && selectedSubject;

  return (
    <Layout>
      <div className="relative min-h-screen w-full bg-background antialiased">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-slate-950 dark:bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)]"></div>
        <div className="container mx-auto px-4 py-8 lg:py-16">
          <AnimatePresence>{isLoading && <LoadingOverlay />}</AnimatePresence>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
            {isBrowsing ? (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex-grow">
                <Breadcrumbs steps={breadcrumbSteps} onNavigate={handleBreadcrumbNavigate} />
              </motion.div>
            ) : ( <div className="flex-grow"></div> )}
            
            {isBrowsing && (
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2 w-fit bg-card/80 backdrop-blur-sm self-end sm:self-center">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          
          {renderContent()}
        </div>
      </div>
    </Layout>
  )
}

export default PastPapers;