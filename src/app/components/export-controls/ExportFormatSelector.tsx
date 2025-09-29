"use client";

interface ExportFormatSelectorProps {
  selectedFormat: string;
  onFormatChange: (format: string) => void;
}

export function ExportFormatSelector({ selectedFormat, onFormatChange }: ExportFormatSelectorProps) {
  const formats = [
    { value: "srt", label: "SRT Subtitles" },
    { value: "vtt", label: "VTT Subtitles" },
    { value: "ass", label: "ASS Subtitles" },
    { value: "txt", label: "Plain Text" },
  ];

  return (
    <select
      value={selectedFormat}
      onChange={(e) => {
    e.preventDefault();
    onFormatChange(e.target.value);
  }}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    >
      {formats.map((format) => (
        <option key={format.value} value={format.value}>
          {format.label}
        </option>
      ))}
    </select>
  );
}