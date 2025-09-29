"use client";

import { Globe, ChevronDown } from "lucide-react";

import { LanguageOption } from "../LanguageSelector";

import { LanguageOptionItem } from "./LanguageOption";
import { useLanguageDropdown } from "./useLanguageDropdown";

interface LanguageDropdownProps {
  selectedLanguage: string;
  onLanguageChange: () => void;
  languageOptions: LanguageOption[];
  className?: string;
}

function getSelectedOption(
  languageOptions: LanguageOption[],
  selectedLanguage: string
) {
  return (
    languageOptions.find((opt) => opt.code === selectedLanguage) ||
    languageOptions[0]
  );
}

function DropdownTrigger({
  selectedOption,
  isOpen,
  onClick,
}: {
  selectedOption: LanguageOption;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div
      tabIndex={0}
      role="button"
      className={`btn btn-outline w-full justify-start ${
        isOpen ? "btn-active" : ""
      }`}
      onClick={onClick}
    >
      <Globe className="h-4 w-4 mr-2" />
      <ChevronDown className="h-4 w-4 mr-2" />
      <span className="mr-2 flag-emoji">{selectedOption.flag}</span>
      {selectedOption.nativeName}
    </div>
  );
}

function DropdownMenu({
  languageOptions,
  selectedLanguage,
  onSelect,
}: {
  languageOptions: LanguageOption[];
  selectedLanguage: string;
  onSelect: () => void;
}) {
  return (
    <div
      tabIndex={0}
      className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-full mt-1 z-10"
    >
      {languageOptions.map((option) => (
        <LanguageOptionItem
          key={option.code}
          option={option}
          isSelected={selectedLanguage === option.code}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function LanguageDropdown({
  selectedLanguage,
  onLanguageChange,
  languageOptions,
  className = "",
}: LanguageDropdownProps) {
  const { isOpen, toggleDropdown, closeDropdown } = useLanguageDropdown();

  const selectedOption = getSelectedOption(languageOptions, selectedLanguage);

  const handleLanguageSelect = () => {
    onLanguageChange();
    closeDropdown();
  };

  return (
    <div className={`dropdown ${className}`}>
      <label className="label">
        <span className="label-text">Translate to:</span>
      </label>

      <DropdownTrigger
        selectedOption={selectedOption}
        isOpen={isOpen}
        onClick={toggleDropdown}
      />

      {isOpen && (
        <DropdownMenu
          languageOptions={languageOptions}
          selectedLanguage={selectedLanguage}
          onSelect={handleLanguageSelect}
        />
      )}
    </div>
  );
}
