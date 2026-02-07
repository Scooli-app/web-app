"use client";

import { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { setTheme, type ThemeMode } from "@/store/ui/uiSlice";
import type { RootState, AppDispatch } from "@/store/store";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function ThemeToggleComponent() {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.ui.theme);

  const handleThemeChange = useCallback(
    (newTheme: ThemeMode) => {
      dispatch(setTheme(newTheme));
    },
    [dispatch]
  );

  const CurrentIcon = THEME_OPTIONS.find((opt) => opt.value === theme)?.icon || Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-foreground hover:bg-accent hover:text-primary"
        >
          <CurrentIcon className="h-5 w-5" />
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ThemeToggle = memo(ThemeToggleComponent);
ThemeToggle.displayName = "ThemeToggle";

export default ThemeToggle;

