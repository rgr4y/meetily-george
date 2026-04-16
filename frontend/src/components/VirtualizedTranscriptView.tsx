'use client';

import { useCallback, useRef, useReducer, startTransition, useEffect, useState, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useTranscriptStreaming } from "@/hooks/useTranscriptStreaming";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { RecordingStatusBar } from "./RecordingStatusBar";
import { motion, AnimatePresence } from "framer-motion";
import { TranscriptSegmentData } from "@/types";
import { UserRound } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { isDev } from "@/lib/env";

export interface VirtualizedTranscriptViewProps {
    /** Transcript segments to display */
    segments: TranscriptSegmentData[];
    /** Whether recording is in progress */
    isRecording?: boolean;
    /** Whether recording is paused */
    isPaused?: boolean;
    /** Whether processing/finalizing transcription */
    isProcessing?: boolean;
    /** Whether stopping */
    isStopping?: boolean;
    /** Enable streaming effect for latest segment */
    enableStreaming?: boolean;
    /** Show confidence indicators */
    showConfidence?: boolean;
    /** Completely disable auto-scroll behavior (for meeting details page) */
    disableAutoScroll?: boolean;

    // Pagination props (infinite scroll)
    hasMore?: boolean;
    isLoadingMore?: boolean;
    totalCount?: number;
    loadedCount?: number;
    onLoadMore?: () => void;
}

// Threshold for enabling virtualization (below this, use simple rendering)
const VIRTUALIZATION_THRESHOLD = 10;

// Helper function to format seconds as recording-relative time [MM:SS]
function formatRecordingTime(seconds: number | undefined): string {
    if (seconds === undefined) return '[--:--]';

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `[${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
}

// Helper function to remove filler words and repetitions
function cleanStopWords(text: string): string {
    const stopWords = ['uh', 'um', 'er', 'ah', 'hmm', 'hm', 'eh', 'oh'];

    let cleanedText = text;
    stopWords.forEach(word => {
        const pattern = new RegExp(`\\b${word}\\b[,\\s]*`, 'gi');
        cleanedText = cleanedText.replace(pattern, ' ');
    });

    return cleanedText.replace(/\s+/g, ' ').trim();
}

// Memoized speaker pill with inline rename
const SpeakerPill = memo(function SpeakerPill({
    speakerKey,
    displayName,
    onRename,
}: {
    speakerKey: string;
    displayName: string;
    onRename: (key: string, name: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(displayName);
    const inputRef = useRef<HTMLInputElement>(null);

    const open = () => {
        setDraft(displayName);
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed) onRename(speakerKey, trimmed);
        setEditing(false);
    };

    const SPEAKER_COLORS: Record<string, string> = {
        Me: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
        S1: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
        S2: 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25',
        S3: 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25',
        S4: 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25',
        P1: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
        P2: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25',
    };
    const colorClass = SPEAKER_COLORS[speakerKey] ?? 'bg-muted text-muted-foreground border-border hover:bg-accent';

    if (editing) {
        return (
            <span className="inline-flex items-center gap-1 mr-2">
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') setEditing(false);
                    }}
                    className="text-xs px-2 py-0.5 rounded border border-border bg-background text-foreground w-24 outline-none focus:ring-1 focus:ring-primary"
                    maxLength={32}
                />
            </span>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={open}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium mr-2 transition-colors ${colorClass}`}
                >
                    <UserRound className="w-3 h-3" />
                    {displayName}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Click to rename speaker</TooltipContent>
        </Tooltip>
    );
});

// Memoized transcript segment component
const TranscriptSegment = memo(function TranscriptSegment({
    id,
    timestamp,
    text,
    confidence,
    isStreaming,
    showConfidence,
    speaker,
    speakerDisplayName,
    onSpeakerRename,
}: {
    id: string;
    timestamp: number;
    text: string;
    confidence?: number;
    isStreaming: boolean;
    showConfidence: boolean;
    speaker?: string;
    speakerDisplayName?: string;
    onSpeakerRename?: (key: string, name: string) => void;
}) {
    const displayText = cleanStopWords(text) || (text.trim() === '' ? '[Silence]' : text);

    return (
        <div id={`segment-${id}`} className="mb-3">
            {speaker && (
                <div className="mb-1 ml-[58px]">
                    <SpeakerPill
                        speakerKey={speaker}
                        displayName={speakerDisplayName ?? speaker}
                        onRename={onSpeakerRename ?? (() => {})}
                    />
                </div>
            )}
            <div className="flex items-start gap-2">
                <Tooltip>
                    <TooltipTrigger>
                        <span className="text-xs text-muted-foreground mt-1 flex-shrink-0 min-w-[50px]">
                            {formatRecordingTime(timestamp)}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        {confidence !== undefined && showConfidence && (
                            <ConfidenceIndicator confidence={confidence} showIndicator={showConfidence} />
                        )}
                    </TooltipContent>
                </Tooltip>
                <div className="flex-1">
                    {isStreaming ? (
                        <div className="bg-muted border border-border rounded-lg px-3 py-2">
                            <p className="text-base text-foreground leading-relaxed">{displayText}</p>
                        </div>
                    ) : (
                        <p className="text-base text-foreground leading-relaxed">{displayText}</p>
                    )}
                </div>
            </div>
        </div>
    );
});

export const VirtualizedTranscriptView: React.FC<VirtualizedTranscriptViewProps> = ({
    segments,
    isRecording = false,
    isPaused = false,
    isProcessing = false,
    isStopping = false,
    enableStreaming = false,
    showConfidence = true,
    disableAutoScroll = false,
    hasMore = false,
    isLoadingMore = false,
    totalCount = 0,
    loadedCount = 0,
    onLoadMore,
}) => {
    // Speaker display-name overrides: raw label -> user-provided name
    const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
    const handleSpeakerRename = useCallback((key: string, name: string) => {
        setSpeakerNames(prev => ({ ...prev, [key]: name }));
    }, []);

    // Create scroll ref first - shared between virtualizer and auto-scroll hook
    const scrollRef = useRef<HTMLDivElement>(null);
    // Ref for infinite scroll trigger element
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

    // Force re-render without flushSync (avoids React warning)
    const [, rerender] = useReducer((x: number) => x + 1, 0);

    // Setup virtualizer for efficient rendering of large lists
    const virtualizer = useVirtualizer({
        count: segments.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 60, // Estimated height per segment
        overscan: 10, // Render extra items above/below viewport
        onChange: () => {
            startTransition(() => {
                rerender();
            });
        },
    });

    // Custom hook for auto-scrolling (supports both virtualized and non-virtualized)
    useAutoScroll({
        scrollRef,
        segments,
        isRecording,
        isPaused,
        virtualizer,
        virtualizationThreshold: VIRTUALIZATION_THRESHOLD,
        disableAutoScroll,
    });

    // Streaming text effect hook (typewriter animation for new transcripts)
    const { streamingSegmentId, getDisplayText } = useTranscriptStreaming(
        segments,
        isRecording,
        enableStreaming
    );

    // Infinite scroll: IntersectionObserver to trigger loading more
    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoadingMore || isRecording || segments.length === 0) {
            return;
        }

        const triggerElement = loadMoreTriggerRef.current;
        if (!triggerElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    onLoadMore();
                }
            },
            {
                root: null,
                rootMargin: '100px',
                threshold: 0,
            }
        );

        observer.observe(triggerElement);

        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, onLoadMore, isRecording, segments.length]);

    // Scroll-based fallback for fast scrolling
    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoadingMore || isRecording) return;

        const scrollElement = scrollRef.current;
        if (!scrollElement) return;

        let ticking = false;

        const handleScroll = () => {
            if (ticking || isLoadingMore || !hasMore) return;

            ticking = true;
            requestAnimationFrame(() => {
                const { scrollTop, scrollHeight, clientHeight } = scrollElement;
                const scrollBottom = scrollHeight - scrollTop - clientHeight;

                // Trigger load when within 200px of bottom
                if (scrollBottom < 200 && hasMore && !isLoadingMore) {
                    onLoadMore();
                }
                ticking = false;
            });
        };

        scrollElement.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollElement.removeEventListener('scroll', handleScroll);
    }, [onLoadMore, hasMore, isLoadingMore, isRecording]);

    // Use simple rendering for small lists, virtualization for large lists
    const useVirtualization = segments.length >= VIRTUALIZATION_THRESHOLD;

    const { transcriptModelConfig } = useConfig();
    const modelLabel = transcriptModelConfig?.model || transcriptModelConfig?.provider || '';

    return (
        <div ref={scrollRef} className="flex flex-col h-full overflow-y-auto px-4 py-2">
            {/* Model label - top right, dev only */}
            {isDev && modelLabel && (
                <div className="flex justify-end mb-1">
                    <span className="text-xs text-muted-foreground/50">{modelLabel}</span>
                </div>
            )}

            {/* Recording Status Bar - Sticky at top, always visible when recording */}
            <AnimatePresence>
                {isRecording && (
                    <div className="sticky top-0 z-10 bg-background pb-2">
                        <RecordingStatusBar isPaused={isPaused} />
                    </div>
                )}
            </AnimatePresence>

            {/* Content - add padding when recording to prevent overlap */}
            <div className={isRecording ? 'pt-2' : ''}>
            {segments.length === 0 ? (
                // Empty state
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-muted-foreground mt-8"
                >
                    {isRecording ? (
                        <>
                            <div className="flex items-center justify-center mb-3">
                                <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-orange-500' : 'bg-blue-500 animate-pulse'}`}></div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isPaused ? 'Recording paused' : 'Listening for speech...'}
                            </p>
                            <p className="text-xs mt-1 text-muted-foreground/70">
                                {isPaused ? 'Click resume to continue recording' : 'Speak to see live transcription'}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-[1.9rem] font-semibold">Welcome to meetily!</p>
                            <p className="text-[0.9rem] mt-[1rem]">Start recording to see live transcription</p>
                        </>
                    )}
                </motion.div>
            ) : useVirtualization ? (
                // Virtualized rendering for large lists
                <>
                    <div
                        style={{
                            height: virtualizer.getTotalSize(),
                            width: "100%",
                            position: "relative",
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const segment = segments[virtualRow.index];
                            const isStreaming = streamingSegmentId === segment.id;

                            return (
                                <div
                                    key={segment.id}
                                    data-index={virtualRow.index}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <TranscriptSegment
                                        id={segment.id}
                                        timestamp={segment.timestamp}
                                        text={getDisplayText(segment)}
                                        confidence={segment.confidence}
                                        isStreaming={isStreaming}
                                        showConfidence={showConfidence}
                                        speaker={segment.speaker}
                                        speakerDisplayName={segment.speaker ? (speakerNames[segment.speaker] ?? segment.speaker) : undefined}
                                        onSpeakerRename={handleSpeakerRename}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Infinite scroll trigger and loading indicator */}
                    {(hasMore || isLoadingMore) && !isRecording && segments.length > 0 && (
                        <div ref={loadMoreTriggerRef} className="flex justify-center items-center py-4 mt-2">
                            {isLoadingMore ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                                    <span className="text-sm">Loading more...</span>
                                </div>
                            ) : hasMore && totalCount > 0 ? (
                                <span className="text-sm text-muted-foreground/70">
                                    Showing {loadedCount} of {totalCount} segments
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* Listening indicator when recording */}
                    {!isStopping && isRecording && !isPaused && !isProcessing && segments.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 mt-4 text-muted-foreground"
                        >
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm">Listening...</span>
                        </motion.div>
                    )}
                </>
            ) : (
                // Simple rendering for small lists (better animations)
                <>
                    <div className="space-y-1">
                        {segments.map((segment) => {
                            const isStreaming = streamingSegmentId === segment.id;

                            return (
                                <motion.div
                                    key={segment.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <TranscriptSegment
                                        id={segment.id}
                                        timestamp={segment.timestamp}
                                        text={getDisplayText(segment)}
                                        confidence={segment.confidence}
                                        isStreaming={isStreaming}
                                        showConfidence={showConfidence}
                                        speaker={segment.speaker}
                                        speakerDisplayName={segment.speaker ? (speakerNames[segment.speaker] ?? segment.speaker) : undefined}
                                        onSpeakerRename={handleSpeakerRename}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Infinite scroll trigger (for small lists that grow) */}
                    {(hasMore || isLoadingMore) && !isRecording && segments.length > 0 && (
                        <div ref={loadMoreTriggerRef} className="flex justify-center items-center py-4 mt-2">
                            {isLoadingMore ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                                    <span className="text-sm">Loading more...</span>
                                </div>
                            ) : hasMore && totalCount > 0 ? (
                                <span className="text-sm text-muted-foreground/70">
                                    Showing {loadedCount} of {totalCount} segments
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* Listening indicator when recording */}
                    {!isStopping && isRecording && !isPaused && !isProcessing && segments.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 mt-4 text-muted-foreground"
                        >
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm">Listening...</span>
                        </motion.div>
                    )}
                </>
            )}
            </div>
        </div>
    );
};
