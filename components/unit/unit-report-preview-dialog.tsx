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

  // Function to handle download
  const handleDownload = () => {
    downloadReport(report.content, fileName);
    toast({
      title: "Download Started",
      description: `Downloading report: ${fileName}`,
    });
  };

  // Function to copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.content);
      setCopied(true);
      toast({
        title: "Copied to Clipboard",
        description: "Report content has been copied to clipboard",
      });

      // Reset copied status after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  // Toggle between rendered markdown and raw text
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

        {/* Content view toggle */}
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

        {/* Scrollable report content */}
        <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-md my-2 bg-muted/20">
          {showRaw ? (
            <pre className="whitespace-pre-wrap text-sm">{report.content}</pre>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
