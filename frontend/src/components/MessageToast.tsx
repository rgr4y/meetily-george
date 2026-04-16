'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface MessageToastProps {
    message: string;
    type: 'success' | 'error' | 'warning';
    show: boolean;
    setShow: (show: boolean) => void;
}

export function MessageToast({ message, type, show, setShow }: MessageToastProps) {
    const { themeDefinition, colorScheme } = useTheme();
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setShow(false);
        }, 3000);
        
        return () => clearTimeout(timer);
    }, [setShow]); 

    if (!show) return null;

    const colors = themeDefinition[colorScheme];
    let textColor: string;
    let backgroundColor: string;

    if (type === 'success') {
        // Use primary color for success
        textColor = colors.primaryForeground;
        backgroundColor = colors.primary;
    } else if (type === 'error') {
        // Use destructive color for errors
        textColor = colors.destructiveForeground;
        backgroundColor = colors.destructive;
    } else {
        // Use warning color for warnings
        textColor = colors.warningForeground;
        backgroundColor = colors.warning;
    }

    const style = {
        backgroundColor: `hsl(${backgroundColor})`,
        color: `hsl(${textColor})`,
    };
    
    return (
        <span 
            style={style}
            className="px-4 py-2 rounded-md font-medium transition-opacity animate-fade-in"
        >
            {message}
        </span>
    );
}