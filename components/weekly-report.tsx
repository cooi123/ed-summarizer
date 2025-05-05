"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
import { useState, useEffect } from "react";

type WeeklyReportProps = {
  content: string;
  isLoading?: boolean;
};

export function WeeklyReport({
  content,
  isLoading = false,
}: WeeklyReportProps) {
  const [sanitizedContent, setSanitizedContent] = useState<string>("");

  useEffect(() => {
    // Ensure content is a valid string and sanitize if needed
    if (content) {
      try {
        // If content is an object, attempt to stringify it
        const processedContent =
          typeof content === "object"
            ? JSON.stringify(content, null, 2)
            : String(content);
        setSanitizedContent(processedContent);
      } catch (error) {
        console.error("Error processing markdown content:", error);
        setSanitizedContent("Error rendering content. Please try again.");
      }
    } else {
      setSanitizedContent("");
    }
  }, [content]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-2 mt-6">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!sanitizedContent) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">
          No report data available. Generate a report to see results.
        </p>
      </Card>
    );
  }

  // Use a simpler approach without custom components to avoid potential issues
  try {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown>{sanitizedContent}</ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">
          There was an error rendering the report. Please try again.
        </p>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {sanitizedContent}
        </pre>
      </Card>
    );
  }
}
