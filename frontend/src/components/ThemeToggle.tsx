'use client'

import React from 'react'
import { Moon, Sun, Monitor, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/contexts/ThemeContext'

interface ThemeToggleProps {
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
}

export function ThemeToggle({ variant = 'ghost', size = 'icon', className }: ThemeToggleProps) {
  const { colorScheme, preference, themeName, availableThemes, setPreference, setThemeName } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          aria-label="Theme settings"
          title="Theme settings"
          variant={variant}
          size={size}
          className={className}
        >
          {colorScheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setPreference('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {preference === 'light' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPreference('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {preference === 'dark' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPreference('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {preference === 'system' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {availableThemes.map((theme) => (
          <DropdownMenuItem key={theme.name} onClick={() => setThemeName(theme.name)}>
            <Palette className="mr-2 h-4 w-4" />
            {theme.label}
            {themeName === theme.name && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
