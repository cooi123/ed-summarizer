import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Copy, Check, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadReport } from "@/util/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

interface Thread {
  id: string;
  title: string;
  content: string;
  url: string;
}

interface RelatedQuestion {
  theme: string;
  summary: string;
  threads: Thread[];
}

interface AnalysisReportPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    content: string;
    createdAt: string;
    status: string;
    weekInfo: string;
    relatedQuestions: RelatedQuestion[];
  };
  unitName: string;
  fileName: string;
}

export function AnalysisReportPreviewDialog({
  isOpen,
  onOpenChange,
  report,
  unitName,
  fileName,
}: AnalysisReportPreviewDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [activeTab, setActiveTab] = useState("report");

  const handleDownload = () => {
    downloadReport(report.content, fileName);
    toast({
      title: "Download Started",
      description: `Downloading report: ${fileName}`,
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.content);
      setCopied(true);
      toast({
        title: "Copied to Clipboard",
        description: "Report content has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleRawView = () => {
    setShowRaw(!showRaw);
  };

  const handleExternalLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  const renderMarkdown = (content: string) => (
    <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:mb-4 [&>*:last-child]:mb-0">
      <style jsx global>{`
        .prose h1 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          color: hsl(var(--foreground));
        }
        .prose h2 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1.25em;
          margin-bottom: 0.75em;
          color: hsl(var(--foreground));
          border-bottom: 1px solid hsl(var(--border));
          padding-bottom: 0.5em;
        }
        .prose h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
          color: hsl(var(--foreground));
        }
        .prose ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose li {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .prose strong {
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        .prose p {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
      <ReactMarkdown
        // remarkPlugins={}
        components={{
          p: ({ children }) => <p className="mb-4">{children}</p>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{unitName}</span>
            <span
              className={`text-sm px-2 py-1 rounded-full ${
                report.status === "completed"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : report.status === "failed"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
              }`}
            >
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </span>
          </DialogTitle>
          <DialogDescription>
            <span className="block">
              Generated on {new Date(report.createdAt).toLocaleDateString()} at{" "}
              {new Date(report.createdAt).toLocaleTimeString()}
            </span>
            <span className="block font-medium text-primary">{report.weekInfo}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="evidence">Supporting Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="mt-4">
            <div className="flex items-center justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRawView}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                {showRaw ? "Show Formatted" : "Show Raw"}
              </Button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-md my-2 bg-muted/20">
              {showRaw ? (
                <pre className="whitespace-pre-wrap text-sm">{report.content}</pre>
              ) : (
                renderMarkdown(report.content)
              )}
            </div>
          </TabsContent>

          <TabsContent value="evidence" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              {report.relatedQuestions.map((question, index) => (
                <Card key={index} className="hover:bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-lg">{question.theme}</CardTitle>
                    <div className="mt-2">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Summary</div>
                      <p className="text-muted-foreground">{question.summary}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {question.threads.length > 0 ? (
                      <>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Related Questions</div>
                        <Separator className="mb-4" />
                        <Accordion type="single" collapsible className="w-full">
                          {question.threads.map((thread) => (
                            <AccordionItem key={thread.id} value={thread.id}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <span className="font-medium">{thread.title}</span>
                                  <span
                                    className="h-8 w-8 p-0 flex items-center justify-center"
                                    onClick={(e) => handleExternalLink(e, thread.url)}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                {renderMarkdown(thread.content)}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">No specific threads available for this theme.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 