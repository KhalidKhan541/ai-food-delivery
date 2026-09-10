"use client";

import * as React from "react";
import { Search, X, Clock, TrendingUp, Mic, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  text: string;
  type: "history" | "trending" | "restaurant" | "cuisine";
}

interface SearchBarProps {
  value?: string;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  isLoading?: boolean;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  onClearRecent?: () => void;
  onVoiceSearch?: () => void;
  className?: string;
}

export function SearchBar({
  value: controlledValue,
  placeholder = "Search restaurants, cuisines, or dishes...",
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  onChange,
  onSearch,
  onSuggestionClick,
  onClearRecent,
  onVoiceSearch,
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = React.useState(controlledValue || "");
  const [isFocused, setIsFocused] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const filteredSuggestions = React.useMemo(() => {
    if (!value) return suggestions;
    const query = value.toLowerCase();
    return suggestions.filter((s) =>
      s.text.toLowerCase().includes(query)
    );
  }, [value, suggestions]);

  const showDropdown = showSuggestions && (isFocused || value.length > 0);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
      onSuggestionClick?.(filteredSuggestions[selectedIndex]);
    } else if (value.trim()) {
      onSearch?.(value.trim());
    }
    setShowSuggestions(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case "Escape":
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  }

  function handleClear() {
    setInternalValue("");
    onChange?.("");
    inputRef.current?.focus();
  }

  function handleSuggestionClick(suggestion: SearchSuggestion) {
    setInternalValue(suggestion.text);
    onChange?.(suggestion.text);
    onSuggestionClick?.(suggestion);
    setShowSuggestions(false);
  }

  const suggestionIcons: Record<string, React.ElementType> = {
    history: Clock,
    trending: TrendingUp,
    restaurant: Search,
    cuisine: Search,
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "flex items-center rounded-2xl border bg-card transition-all duration-200",
            isFocused
              ? "ring-2 ring-primary/20 border-primary/40 shadow-lg"
              : "hover:border-primary/20"
          )}
        >
          <Search className="ml-4 h-5 w-5 flex-shrink-0 text-muted-foreground" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent px-3 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            autoComplete="off"
          />

          {isLoading && (
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}

          {value && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="mr-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {onVoiceSearch && (
            <button
              type="button"
              onClick={onVoiceSearch}
              className="mr-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              aria-label="Voice search"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}

          <button
            type="submit"
            className="mr-1.5 flex h-9 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-card shadow-xl">
          {!value && recentSearches.length > 0 && (
            <div className="border-b p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Recent Searches
                </span>
                {onClearRecent && (
                  <button
                    onClick={onClearRecent}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {recentSearches.slice(0, 5).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInternalValue(search);
                      onChange?.(search);
                      onSearch?.(search);
                      setShowSuggestions(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span className="truncate">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredSuggestions.length > 0 && (
            <div className="p-2">
              {filteredSuggestions.map((suggestion, index) => {
                const Icon = suggestionIcons[suggestion.type] || Search;
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10 text-primary"
                        : "text-card-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{suggestion.text}</span>
                    {suggestion.type === "trending" && (
                      <span className="ml-auto rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                        Trending
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {value && filteredSuggestions.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
