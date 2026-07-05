import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" className="min-h-11 min-w-11 md:min-h-9 md:min-w-9" onClick={toggle} aria-label="Toggle theme">
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
};