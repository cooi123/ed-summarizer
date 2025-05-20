"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Flag, MessageSquare } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Question {
  id: string;
  title: string;
  content: string;
  url: string;
  is_answered: boolean;
  is_staff_answered:boolean 
  is_student_answered:boolean
  needs_attention: boolean;
  vote_count: number;
}

interface QuestionClusterProps {
  theme: string;
  summary: string;
  questions: Question[];
  transactionIds: string[];
  metadata: Record<string, any>;
  week: number;
}

export function QuestionGroup({ theme, summary, questions, week }: QuestionClusterProps) {
  const [expanded, setExpanded] = useState<string | false>(false);
  const sortedQuestions = questions.slice().sort((a, b) => Number(a.is_answered) - Number(b.is_answered));

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">{theme}</CardTitle>
              <Badge variant="outline" className="text-xs">
                Week {week}
              </Badge>
            </div>
            <Badge variant="secondary">{questions.length} questions</Badge>
          </div>
          {summary && (
            <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
              {summary}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Accordion
          type="single"
          collapsible
          value={expanded as string}
          onValueChange={setExpanded}
        >
          {sortedQuestions.map((question) => (
            <AccordionItem key={question.id} value={question.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{question.title}</span>
                    <Badge variant={question.is_answered ? 'secondary' : 'destructive'} className="text-xs">
                      {question.is_answered 
                        ? `Answered by ${question.is_staff_answered ? 'Staff' : 'Student'}`
                        : 'Unanswered'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {question.content}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{question.content}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Answer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Flag
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={question.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </a>
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
} 