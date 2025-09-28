"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { ChevronDown } from "lucide-react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const languageOptions: LanguageOption[] = [
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  className?: string;
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  className = "",
}: LanguageSelectorProps) {
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
        className={`btn btn-outline w-full justify-start ${
          isOpen ? "btn-active" : ""
        }`}
        onClick={() => setIsOpen(!isOpen)}
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
            <li key={option.code}>
              <a
                onClick={() => handleLanguageSelect(option.code)}
                className={`justify-between ${
                  selectedLanguage === option.code ? "active" : ""
                }`}
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
          ))}
        </div>
      )}
    </div>
  );
}
