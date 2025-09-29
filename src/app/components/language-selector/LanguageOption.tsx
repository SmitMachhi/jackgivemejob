"use client";

import { LanguageOption } from "../LanguageSelector";

interface LanguageOptionItemProps {
  option: LanguageOption;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

export function LanguageOptionItem({ option, isSelected, onSelect }: LanguageOptionItemProps) {
  return (
    <li>
      <a
        onClick={(e) => {
          e.preventDefault();
          onSelect(option.code);
        }}
        className={`justify-between ${isSelected ? "active" : ""}`}
      >
        <span className="text-lg flag-emoji">{option.flag}</span>
        <div className="text-left">
          <div className="font-medium">{option.nativeName}</div>
          <div className="text-xs text-base-content/70">
            {option.name}
          </div>
        </div>
      </a>
    </li>
  );
}