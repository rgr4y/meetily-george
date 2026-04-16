"use client";

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import "@blocknote/shadcn/style.css";
import ReactJsonView from 'react-json-view';
import { useTheme } from '@/contexts/ThemeContext';
import { StructuredSummaryResponse } from '@/types';
import { invoke } from '@tauri-apps/api/core';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BadgeCheck, Bug, CircleDot, Gavel, Plus, SquareCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditableStructuredSummaryRef {
  isDirty: boolean;
  saveSummary: () => Promise<void>;
  getMarkdown: () => Promise<string>;
  getData: () => Promise<EditableStructuredData>;
}

export interface EditableStructuredData {
  summary_markdown: string;
  key_points: string[];
  action_items: string[];
  decisions: string[];
}

interface EditableStructuredSummaryProps {
  structuredSummary: StructuredSummaryResponse;
  summaryMarkdown?: string | null;
  meetingId: string;
  onSave?: (data: { markdown?: string; summary_json?: any[] }) => Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
  className?: string;
}

/** Single editable list item with inline editing */
function EditableListItem({
  value,
  icon: Icon,
  onChange,
  onRemove,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  onChange: (newValue: string) => void;
  onRemove: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <li className="group flex items-start gap-3 text-sm leading-6 text-foreground">
      <Icon className="mt-1 h-4 w-4 shrink-0 text-primary" />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        className="flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        placeholder="Type here..."
      />
      <button
        onClick={onRemove}
        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
        title="Remove item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/** Editable list section (key points, action items, decisions) */
function EditableListSection({
  items,
  icon,
  placeholder,
  onChange,
}: {
  items: string[];
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  onChange: (newItems: string[]) => void;
}) {
  const handleItemChange = useCallback((index: number, newValue: string) => {
    const updated = [...items];
    updated[index] = newValue;
    onChange(updated);
  }, [items, onChange]);

  const handleRemoveItem = useCallback((index: number) => {
    onChange(items.filter((_, i) => i !== index));
  }, [items, onChange]);

  const handleAddItem = useCallback(() => {
    onChange([...items, '']);
    // Focus the new item after render
    setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      const last = textareas[textareas.length - 1];
      last?.focus();
    }, 50);
  }, [items, onChange]);

  return (
    <div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <EditableListItem
            key={index}
            value={item}
            icon={icon}
            onChange={(v) => handleItemChange(index, v)}
            onRemove={() => handleRemoveItem(index)}
          />
        ))}
      </ul>
      <button
        onClick={handleAddItem}
        className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-1 rounded hover:bg-muted"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{placeholder}</span>
      </button>
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

export const EditableStructuredSummary = forwardRef<EditableStructuredSummaryRef, EditableStructuredSummaryProps>(({
  structuredSummary,
  summaryMarkdown,
  meetingId,
  onSave,
  onDirtyChange,
  className,
}, ref) => {
  const { colorScheme } = useTheme();
  const [isDirty, setIsDirty] = useState(false);
  const isContentLoaded = useRef(false);

  // Editable state for list sections
  const [keyPoints, setKeyPoints] = useState<string[]>(
    structuredSummary.key_points.filter(s => s.trim())
  );
  const [actionItems, setActionItems] = useState<string[]>(
    structuredSummary.action_items.filter(s => s.trim())
  );
  const [decisions, setDecisions] = useState<string[]>(
    structuredSummary.decisions.filter(s => s.trim())
  );

  // Sync list state when structuredSummary prop changes (e.g. after regeneration)
  useEffect(() => {
    setKeyPoints(structuredSummary.key_points.filter(s => s.trim()));
    setActionItems(structuredSummary.action_items.filter(s => s.trim()));
    setDecisions(structuredSummary.decisions.filter(s => s.trim()));
    setIsDirty(false);
  }, [structuredSummary]);

  // BlockNote editor for the main summary
  const editor = useCreateBlockNote({});

  // Strip ALL known structured/section headers from markdown so BlockNote
  // only shows the summary prose.  Matches H2 (## Section), bold headers
  // (**Section**), and common LLM section names.  Strips from header to
  // next header or end of string.
  const stripStructuredSections = useCallback((md: string): string => {
    // Known section names the LLM may emit (case-insensitive)
    const sectionNames = [
      'Key Points', 'Key Decisions', 'Action Items', 'Decisions',
      'Discussion Highlights', 'Summary', 'Main Topics',
      'Next Steps', 'Follow-up Items', 'Highlights',
    ].join('|');

    // Strip ## Header style sections
    let cleaned = md.replace(
      new RegExp(`^##\\s+(?:${sectionNames})\\b[\\s\\S]*?(?=\\n##\\s|$)`, 'gim'),
      ''
    );

    // Strip **Header** style sections (bold on its own line, followed by content)
    cleaned = cleaned.replace(
      new RegExp(`^\\*\\*(?:${sectionNames})\\*\\*\\s*\\n[\\s\\S]*?(?=\\n\\*\\*[A-Z]|\\n##\\s|$)`, 'gim'),
      ''
    );

    return cleaned.trim();
  }, []);

  // Load summary markdown into BlockNote
  useEffect(() => {
    if (!editor) return;
    // Always strip structured sections — the backend may fall back to storing
    // the full LLM markdown in the summary field when no clean "summary" section
    // was extracted.  So both summaryMarkdown AND structuredSummary.summary
    // can contain Key Points / Action Items / Decisions / Discussion Highlights.
    const raw = structuredSummary.summary.trim() || summaryMarkdown?.trim() || '';
    const md = stripStructuredSections(raw);
    if (!md) {
      isContentLoaded.current = true;
      return;
    }

    const load = async () => {
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(md);
        editor.replaceBlocks(editor.document, blocks);
      } catch (err) {
        console.error('Failed to parse summary markdown into BlockNote:', err);
      }
      // Delay to let editor settle before tracking changes
      setTimeout(() => {
        isContentLoaded.current = true;
      }, 150);
    };
    load();
  }, [editor, summaryMarkdown, structuredSummary.summary, stripStructuredSections]);

  // Mark dirty when list sections change
  const handleListChange = useCallback((setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    return (newItems: string[]) => {
      setter(newItems);
      setIsDirty(true);
    };
  }, []);

  // Notify parent of dirty state
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Build full markdown from all sections
  const getFullMarkdown = useCallback(async () => {
    const summaryMd = await editor.blocksToMarkdownLossy(editor.document);
    const parts: string[] = [];

    if (summaryMd.trim()) {
      parts.push(summaryMd.trim());
    }

    const nonEmpty = (arr: string[]) => arr.filter(s => s.trim());

    if (nonEmpty(keyPoints).length > 0) {
      parts.push('## Key Points\n' + nonEmpty(keyPoints).map(p => `- ${p}`).join('\n'));
    }
    if (nonEmpty(actionItems).length > 0) {
      parts.push('## Action Items\n' + nonEmpty(actionItems).map(p => `- ${p}`).join('\n'));
    }
    if (nonEmpty(decisions).length > 0) {
      parts.push('## Decisions\n' + nonEmpty(decisions).map(p => `- ${p}`).join('\n'));
    }

    return parts.join('\n\n');
  }, [editor, keyPoints, actionItems, decisions]);

  // Save all structured data
  const saveSummary = useCallback(async () => {
    if (!isDirty) return;

    // Save ONLY the summary prose to summary_processes.result — NOT the
    // combined markdown with structured fields appended.  Structured fields
    // are persisted separately via api_save_structured_summary so they
    // must not be duplicated inside the result column.
    const summaryOnlyMd = await editor.blocksToMarkdownLossy(editor.document);

    if (onSave) {
      await onSave({ markdown: summaryOnlyMd });
    }

    // Save structured fields to summary_processes columns
    await invoke('api_save_structured_summary', {
      meetingId,
      summaryText: summaryOnlyMd,
      keyPoints: keyPoints.filter(s => s.trim()),
      actionItems: actionItems.filter(s => s.trim()),
      decisions: decisions.filter(s => s.trim()),
    });

    setIsDirty(false);
  }, [isDirty, meetingId, editor, keyPoints, actionItems, decisions, onSave]);

  // Expose ref API
  useImperativeHandle(ref, () => ({
    isDirty,
    saveSummary,
    getData: async () => {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      return {
        summary_markdown: markdown,
        key_points: keyPoints.filter(s => s.trim()),
        action_items: actionItems.filter(s => s.trim()),
        decisions: decisions.filter(s => s.trim()),
      };
    },
    getMarkdown: getFullMarkdown,
  }), [isDirty, saveSummary, editor, keyPoints, actionItems, decisions, getFullMarkdown]);

  // Build sections config for accordion
  type SectionId = 'summary' | 'key-points' | 'action-items' | 'decisions';
  const sections: Array<{
    id: SectionId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }> = [
    { id: 'summary', label: 'Summary', icon: BadgeCheck, count: 1 },
    { id: 'key-points', label: 'Key Points', icon: CircleDot, count: keyPoints.length },
    { id: 'action-items', label: 'Action Items', icon: SquareCheck, count: actionItems.length },
    { id: 'decisions', label: 'Decisions', icon: Gavel, count: decisions.length },
  ];

  // Default open: all sections that have content
  const defaultOpen = sections
    .filter(s => s.count > 0)
    .map(s => s.id);

  return (
    <div className={cn('w-full', className)}>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
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
                    <SectionBadge count={section.count} />
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-0 pb-4">
                  {section.id === 'summary' && (
                    <div className="rounded-lg border border-border overflow-hidden [&_.bn-editor]:py-6 [&_.bn-editor]:px-7">
                      <BlockNoteView
                        editor={editor}
                        editable={true}
                        onChange={() => {
                          if (isContentLoaded.current) {
                            setIsDirty(true);
                          }
                        }}
                        theme={colorScheme}
                      />
                    </div>
                  )}

                  {section.id === 'key-points' && (
                    <EditableListSection
                      items={keyPoints}
                      icon={CircleDot}
                      placeholder="Add key point"
                      onChange={handleListChange(setKeyPoints)}
                    />
                  )}

                  {section.id === 'action-items' && (
                    <EditableListSection
                      items={actionItems}
                      icon={SquareCheck}
                      placeholder="Add action item"
                      onChange={handleListChange(setActionItems)}
                    />
                  )}

                  {section.id === 'decisions' && (
                    <EditableListSection
                      items={decisions}
                      icon={Gavel}
                      placeholder="Add decision"
                      onChange={handleListChange(setDecisions)}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Debug: raw structured data from DB */}
      <div className="mt-4 rounded-xl border border-border bg-card shadow-sm">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="debug-raw" className="px-4 border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <Bug className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Raw DB Row (debug)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-4">
              <div className="overflow-auto rounded-lg bg-muted p-3 max-h-96">
                <ReactJsonView
                  src={{
                    summary: structuredSummary.summary,
                    key_points: structuredSummary.key_points,
                    action_items: structuredSummary.action_items,
                    decisions: structuredSummary.decisions,
                    summaryMarkdown: summaryMarkdown,
                  }}
                  theme="monokai"
                  displayDataTypes={true}
                  enableClipboard={true}
                  collapsed={1}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
});

EditableStructuredSummary.displayName = 'EditableStructuredSummary';
