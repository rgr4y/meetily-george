import React, { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import Image from 'next/image';
import AnalyticsConsentSwitch from "./AnalyticsConsentSwitch";
import { UpdateDialog } from "./UpdateDialog";
import { updateService, UpdateInfo } from '@/services/updateService';
import { Button } from './ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { isDev } from '@/lib/env';

interface DictationDebugSnapshot {
    listener_running: boolean;
    listener_mode?: string;
    listener_last_error?: string;
    listener_started_at_ms?: number;
    event_count: number;
    accessibility_granted: boolean;
    input_monitoring_granted: boolean;
    current_hotkey: string;
    current_keycode: number;
    require_fn: boolean;
    require_control: boolean;
    require_command: boolean;
    require_option: boolean;
    require_shift: boolean;
    dictation_active: boolean;
    dictation_processing: boolean;
    hotkey_held: boolean;
    fn_held: boolean;
    cmd_held: boolean;
    ctrl_held: boolean;
    alt_held: boolean;
    shift_held: boolean;
    events: unknown[];
}

export function About() {
    const [currentVersion, setCurrentVersion] = useState<string>('0.3.0');
    const [gitHash, setGitHash] = useState<string | null>(null);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [dictationDebug, setDictationDebug] = useState<DictationDebugSnapshot | null>(null);
    const [showDictationDebug, setShowDictationDebug] = useState(false);
    const [debugRefreshInterval, setDebugRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Get current version on mount
        getVersion().then(setCurrentVersion).catch(console.error);
        
        // Get git hash if in dev mode
        if (isDev) {
            invoke('get_git_hash')
                .then((hash) => setGitHash(hash as string))
                .catch(console.error);
        }
    }, []);

    useEffect(() => {
        // Auto-refresh debug state when debug panel is open
        if (showDictationDebug) {
            const refreshDebugState = async () => {
                try {
                    const debug = await invoke('dictation_get_debug_state') as DictationDebugSnapshot;
                    setDictationDebug(debug);
                } catch (error) {
                    console.error('Failed to get dictation debug state:', error);
                }
            };

            refreshDebugState();
            const interval = setInterval(refreshDebugState, 200); // Refresh every 200ms
            setDebugRefreshInterval(interval);

            return () => {
                if (interval) clearInterval(interval);
            };
        }
    }, [showDictationDebug]);

    const handleContactClick = async () => {
        try {
            await invoke('open_external_url', { url: 'https://meetily.zackriya.com/#about' });
        } catch (error) {
            console.error('Failed to open link:', error);
        }
    };

    const handleCheckForUpdates = async () => {
        setIsChecking(true);
        try {
            const info = await updateService.checkForUpdates(true);
            setUpdateInfo(info);
            if (info.available) {
                setShowUpdateDialog(true);
            } else {
                toast.success('You are running the latest version');
            }
        } catch (error: any) {
            console.error('Failed to check for updates:', error);
            toast.error('Failed to check for updates: ' + (error.message || 'Unknown error'));
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="p-4 space-y-4 h-[80vh] overflow-y-auto">
            {/* Compact Header */}
            <div className="text-center">
                <div className="mb-3">
                    <Image
                        src="icon_128x128.png"
                        alt="Meetily Logo"
                        width={64}
                        height={64}
                        className="mx-auto"
                    />
                </div>
                {/* <h1 className="text-xl font-bold text-gray-900">Meetily</h1> */}
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground"> v{currentVersion}</span>
                    {isDev && gitHash && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                            {gitHash}
                        </span>
                    )}
                </div>
                <p className="text-medium text-muted-foreground mt-1">
                    Real-time notes and summaries that never leave your machine.
                </p>
                <div className="mt-3">
                    <Button
                        onClick={handleCheckForUpdates}
                        disabled={isChecking}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                    >
                        {isChecking ? (
                            <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Checking...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Check for Updates
                            </>
                        )}
                    </Button>
                    {updateInfo?.available && (
                        <div className="mt-2 text-xs text-primary">
                            Update available: v{updateInfo.version}
                        </div>
                    )}
                </div>
            </div>

            {/* Features Grid - Compact */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">What makes Meetily different</h2>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded p-3 hover:bg-accent transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Privacy-first</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Your data & AI processing workflow can now stay within your premise. No cloud, no leaks.</p>
                    </div>
                    <div className="bg-muted rounded p-3 hover:bg-accent transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Use Any Model</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Prefer local open-source model? Great. Want to plug in an external API? Also fine. No lock-in.</p>
                    </div>
                    <div className="bg-muted rounded p-3 hover:bg-accent transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Cost-Smart</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Avoid pay-per-minute bills by running models locally (or pay only for the calls you choose).</p>
                    </div>
                    <div className="bg-muted rounded p-3 hover:bg-accent transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Works everywhere</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Google Meet, Zoom, Teams-online or offline.</p>
                    </div>
                </div>
            </div>

            {/* Coming Soon - Compact */}
            <div className="bg-primary/10 rounded p-3">
                <p className="text-s text-primary">
                    <span className="font-bold">Coming soon:</span> A library of on-device AI agents-automating follow-ups, action tracking, and more.
                </p>
            </div>

            {/* CTA Section - Compact */}
            <div className="text-center space-y-2">
                <h3 className="text-medium font-semibold text-foreground">Ready to push your business further?</h3>
                <p className="text-s text-muted-foreground">
                    If you're planning to build privacy-first custom AI agents or a fully tailored product for your <span className="font-bold">business</span>, we can help you build it.
                </p>
                <button
                    onClick={handleContactClick}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                    Chat with the Zackriya team
                </button>
            </div>

            {/* Footer - Compact */}
            <div className="pt-2 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                    Built by Zackriya Solutions
                </p>
            </div>
            <AnalyticsConsentSwitch />

            {/* Dev-only: Dictation Debug Panel */}
            {isDev && (
                <div className="border border-border rounded p-3 bg-muted/50 space-y-2">
                    <button
                        onClick={() => setShowDictationDebug(!showDictationDebug)}
                        className="text-xs font-medium text-primary hover:underline"
                    >
                        {showDictationDebug ? '▼' : '▶'} Dictation Hotkey Debug
                    </button>
                    
                    {showDictationDebug && dictationDebug && (
                        <div className="text-xs space-y-2 font-mono bg-background/50 p-2 rounded overflow-auto max-h-80">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-muted-foreground">Listener:</span>
                                    <span className={dictationDebug.listener_running ? 'text-green-600' : 'text-red-600'}>
                                        {dictationDebug.listener_running ? ' ✓ Running' : ' ✗ Stopped'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Mode:</span>
                                    <span className="text-foreground"> {dictationDebug.listener_mode || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Hotkey:</span>
                                    <span className="text-foreground"> {dictationDebug.current_hotkey}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Events:</span>
                                    <span className="text-foreground"> {dictationDebug.event_count}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Permissions:</span>
                                    <span className={dictationDebug.accessibility_granted ? 'text-green-600' : 'text-yellow-600'}>
                                        {' Accessibility: '}
                                        {dictationDebug.accessibility_granted ? '✓' : '✗'}
                                    </span>
                                    <span className={dictationDebug.input_monitoring_granted ? 'text-green-600' : 'text-yellow-600'}>
                                        {' Input Monitoring: '}
                                        {dictationDebug.input_monitoring_granted ? '✓' : '✗'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* State Flags */}
                            <div className="border-t border-border pt-2">
                                <span className="text-muted-foreground">State Flags:</span>
                                <div className="grid grid-cols-3 gap-1 mt-1">
                                    <div className={dictationDebug.dictation_active ? 'text-green-600' : 'text-muted-foreground'}>
                                        Dictation Active: {dictationDebug.dictation_active ? '1' : '0'}
                                    </div>
                                    <div className={dictationDebug.dictation_processing ? 'text-yellow-600' : 'text-muted-foreground'}>
                                        Processing: {dictationDebug.dictation_processing ? '1' : '0'}
                                    </div>
                                    <div className={dictationDebug.hotkey_held ? 'text-green-600' : 'text-muted-foreground'}>
                                        Hotkey Held: {dictationDebug.hotkey_held ? '1' : '0'}
                                    </div>
                                    <div className={dictationDebug.fn_held ? 'text-green-600' : 'text-muted-foreground'}>
                                        Fn Held: {dictationDebug.fn_held ? '1' : '0'}
                                    </div>
                                    <div className={dictationDebug.cmd_held ? 'text-green-600' : 'text-muted-foreground'}>
                                        Cmd: {dictationDebug.cmd_held ? '1' : '0'}
                                    </div>
                                    <div className={dictationDebug.ctrl_held ? 'text-green-600' : 'text-muted-foreground'}>
                                        Ctrl: {dictationDebug.ctrl_held ? '1' : '0'}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Events */}
                            {dictationDebug.events.length > 0 && (
                                <div className="border-t border-border pt-2">
                                    <span className="text-muted-foreground">Last 5 Events:</span>
                                    <div className="space-y-1 mt-1">
                                        {(dictationDebug.events.slice(-5) as any[]).map((evt, idx) => (
                                            <div key={idx} className="text-[0.7rem]">
                                                <span className="text-muted-foreground">{evt.action}</span>
                                                <span className="text-foreground"> {evt.key} ({evt.keycode})</span>
                                                <span className="text-muted-foreground"> {evt.event_type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dictationDebug.listener_last_error && (
                                <div className="border-t border-border pt-2 text-red-600">
                                    <span className="text-muted-foreground">Error:</span>
                                    <div className="text-[0.7rem] break-words">{dictationDebug.listener_last_error}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Update Dialog */}
            <UpdateDialog
                open={showUpdateDialog}
                onOpenChange={setShowUpdateDialog}
                updateInfo={updateInfo}
            />
        </div>

    )
}