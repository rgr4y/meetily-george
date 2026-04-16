"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ComponentType } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { BadgeCheck, CircleDot, Gavel, SquareCheck } from 'lucide-react';

export interface StructuredSummaryViewProps {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  fallbackMarkdown?: string | null;
  className?: string;
}

type SectionConfig = {
  id: 'summary' | 'key-points' | 'action-items' | 'decisions';
  label: string;
  icon: ComponentType<{ className?: string }>;
  contentCount: number;
};

function hasStructuredContent(summary: string, keyPoints: string[], actionItems: string[], decisions: string[]): boolean {
  return Boolean(
    summary.trim() ||
      keyPoints.some((item) => item.trim()) ||
      actionItems.some((item) => item.trim()) ||
      decisions.some((item) => item.trim())
  );
}

function renderMarkdownFallback(markdown: string) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-6 prose-li:my-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

function SectionBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-border/70 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {count}
    </span>
  );
}

export function StructuredSummaryView({
  summary,
  keyPoints,
  actionItems,
  decisions,
  fallbackMarkdown,
  className,
}: StructuredSummaryViewProps) {
  const normalizedSummary = summary.trim();
  const normalizedKeyPoints = keyPoints.map((item) => item.trim()).filter(Boolean);
  const normalizedActionItems = actionItems.map((item) => item.trim()).filter(Boolean);
  const normalizedDecisions = decisions.map((item) => item.trim()).filter(Boolean);

  // True structured content requires at least one array field populated.
  // If only summary exists with no key_points/action_items/decisions,
  // it's likely the full markdown dumped into summary — use fallback rendering.
  const hasArrayContent =
    normalizedKeyPoints.length > 0 ||
    normalizedActionItems.length > 0 ||
    normalizedDecisions.length > 0;

  if (!hasArrayContent) {
    // Render the summary or fallbackMarkdown as parsed markdown
    const markdownToRender = fallbackMarkdown?.trim() || normalizedSummary;
    if (markdownToRender) {
      return (
        <div className={cn('w-full', className)}>
          {renderMarkdownFallback(markdownToRender)}
        </div>
      );
    }

    return null;
  }

  const sections = [
    {
      id: 'summary',
      label: 'Summary',
      icon: BadgeCheck,
      contentCount: normalizedSummary ? 1 : 0,
    },
    {
      id: 'key-points',
      label: 'Key Points',
      icon: CircleDot,
      contentCount: normalizedKeyPoints.length,
    },
    {
      id: 'action-items',
      label: 'Action Items',
      icon: SquareCheck,
      contentCount: normalizedActionItems.length,
    },
    {
      id: 'decisions',
      label: 'Decisions',
      icon: Gavel,
      contentCount: normalizedDecisions.length,
    },
  ].filter((section) => section.contentCount > 0) as SectionConfig[];

  return (
    <div className={cn('w-full', className)}>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <AccordionItem key={section.id} value={section.id} className="px-4 last:border-b-0">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{section.label}</span>
                    </div>
                    <SectionBadge count={section.contentCount} />
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-0">
                  {section.id === 'summary' && (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-6 text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizedSummary}</ReactMarkdown>
                    </div>
                  )}

                  {section.id === 'key-points' && (
                    <ul className="space-y-3">
                      {normalizedKeyPoints.map((point) => (
                        <li key={point} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                          <CircleDot className="mt-1 h-4 w-4 shrink-0 text-primary" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.id === 'action-items' && (
                    <ul className="space-y-3">
                      {normalizedActionItems.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                          <SquareCheck className="mt-1 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.id === 'decisions' && (
                    <ul className="space-y-3">
                      {normalizedDecisions.map((decision) => (
                        <li key={decision} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                          <Gavel className="mt-1 h-4 w-4 shrink-0 text-primary" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

    </div>
  );
}
