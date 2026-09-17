"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

export interface SelectOption {
  value: string;
  label: string;
  rarity?: number;
}

interface ScrollableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | SelectOption)[] | (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  id?: string;
}

export const ScrollableSelect: React.FC<ScrollableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Select an option --",
  disabled = false,
  searchable,
  className = "",
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options array
  const normalizedOptions = useMemo<SelectOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Determine if search input should be visible (auto-enable for > 5 items if not explicitly set)
  const isSearchEnabled = searchable !== undefined ? searchable : normalizedOptions.length > 5;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchEnabled]);

  const handleToggle = () => {
    if (disabled) return;
    soundEngine.playClick();
    setIsOpen((prev) => !prev);
    setSearchQuery("");
  };

  const handleSelect = (optionValue: string) => {
    soundEngine.playClick();
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full pl-3.5 pr-9 py-2 bg-black/60 border rounded-xl text-xs font-mono text-left flex items-center justify-between transition-all cursor-pointer shadow-inner ${
          isOpen
            ? "border-yellow-400 ring-2 ring-yellow-400/25 shadow-[0_0_15px_rgba(250,204,21,0.2)] text-white"
            : "border-white/15 hover:border-white/30 text-white"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className={`truncate ${!selectedOption ? "text-gray-500" : "text-white font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 absolute right-3 top-1/2 -translate-y-1/2 ${
            isOpen ? "rotate-180 text-yellow-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu (Strictly 3 Visible Items with Smooth Scrolling) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0d121c] border border-yellow-400/50 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Optional Search Bar for Long Lists */}
          {isSearchEnabled && (
            <div className="p-1.5 border-b border-white/10 bg-black/40 flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-xs font-mono text-white placeholder-gray-500 focus:outline-none py-0.5"
              />
            </div>
          )}

          {/* Scrollable Options List: Height is exactly 3 visible items (3 * 36px = 108px) */}
          <div
            ref={listRef}
            className="max-h-[108px] overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-yellow-400/40 scrollbar-track-black/60"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {filteredOptions.length === 0 ? (
              <div className="h-9 flex items-center justify-center text-[11px] font-mono text-gray-500 italic">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`h-9 px-3 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-yellow-400/20 text-yellow-300 font-bold"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="truncate pr-2 flex items-center space-x-1.5">
                      <span>{opt.label}</span>
                      {opt.rarity && (
                        <span
                          className={`text-[10px] font-bold ${
                            opt.rarity === 5 ? "text-yellow-400" : "text-purple-400"
                          }`}
                        >
                          ({opt.rarity}★)
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
