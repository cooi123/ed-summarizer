import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Copy, Check, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadReport } from "@/util/shared";

interface ReportPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    content: string;
    createdAt: string;
    status: string;
    weekInfo: string;
  };
  unitName: string;
  fileName: string;
}

export function ReportPreviewDialog({
  isOpen,
  onOpenChange,
  report,
  unitName,
  fileName,
}: ReportPreviewDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

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
          <DialogDescription className="space-y-1">
            <div>
              Generated on {new Date(report.createdAt).toLocaleDateString()} at{" "}
              {new Date(report.createdAt).toLocaleTimeString()}
            </div>
            <div className="font-medium text-primary">{report.weekInfo}</div>
          </DialogDescription>
        </DialogHeader>

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
              <ReactMarkdown>
                {report.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

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
