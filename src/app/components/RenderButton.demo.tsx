"use client";

import RenderButton from "./RenderButton";
import { languageOptions } from "./LanguageSelector";

export default function RenderButtonDemo() {
  const languages = languageOptions.map(opt => opt.code);

  return (
    <div className="space-y-8 p-8">
      <h2 className="text-2xl font-bold mb-4">Dynamic Render Button Demo</h2>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Button text changes based on selected language:</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {languages.map(language => (
            <div key={language} className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">
                {languageOptions.find(opt => opt.code === language)?.name}
              </h4>
              <RenderButton
                onClick={() => console.log(`Clicked for ${language}`)}
                processingStatus={null}
                isUploading={false}
                selectedLanguage={language}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Button states:</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Normal State (Vietnamese)</h4>
            <RenderButton
              onClick={() => {}}
              processingStatus={null}
              isUploading={false}
              selectedLanguage="vi"
            />
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Processing State</h4>
            <RenderButton
              onClick={() => {}}
              processingStatus="Processing"
              isUploading={false}
              selectedLanguage="vi"
            />
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Done State (Download)</h4>
            <RenderButton
              onClick={() => {}}
              processingStatus="Done"
              isUploading={false}
              selectedLanguage="vi"
            />
          </div>
        </div>
      </div>
    </div>
  );
}