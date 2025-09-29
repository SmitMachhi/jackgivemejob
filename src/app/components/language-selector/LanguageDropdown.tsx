"use client";

import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { LanguageOption } from "../LanguageSelector";
import { LanguageOptionItem } from "./LanguageOption";

interface LanguageDropdownProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  languageOptions: LanguageOption[];
  className?: string;
}

export function LanguageDropdown({
  selectedLanguage,
  onLanguageChange,
  languageOptions,
  className = "",
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption =
    languageOptions.find((opt) => opt.code === selectedLanguage) ||
    languageOptions[0];

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
    setIsOpen(false);
  };

  return (
    <div className={`dropdown ${className}`}>
      <label className="label">
        <span className="label-text">Translate to:</span>
      </label>

      <div
        tabIndex={0}
        role="button"
        className={`btn btn-outline w-full justify-start ${isOpen ? "btn-active" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <Globe className="h-4 w-4 mr-2" />
        <ChevronDown className="h-4 w-4 mr-2" />
        <span className="mr-2 flag-emoji">{selectedOption.flag}</span>
        {selectedOption.nativeName}
      </div>

      {isOpen && (
        <div
          tabIndex={0}
          className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-full mt-1 z-10"
        >
          {languageOptions.map((option) => (
            <LanguageOptionItem
              key={option.code}
              option={option}
              isSelected={selectedLanguage === option.code}
              onSelect={handleLanguageSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}