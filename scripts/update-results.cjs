const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src/components/Results.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('File length:', content.length);

// Update imports
const oldImport1 = "import React, { useState } from 'react';";
const newImport1 = "import React, { useState, useEffect } from 'react';";

if (content.includes(oldImport1)) {
  content = content.replace(oldImport1, newImport1);
  console.log('Import 1 updated');
} else {
  console.log('Import 1 NOT FOUND');
}

const oldImport2 = "import './Results.css';";
const newImport2 = "import { saveComparisonLocal, isComparisonSaved } from '../services/savedComparisons';\nimport './Results.css';";

if (content.includes(oldImport2)) {
  content = content.replace(oldImport2, newImport2);
  console.log('Import 2 updated');
} else {
  console.log('Import 2 NOT FOUND');
}

// Update ResultsProps interface - use regex to handle any whitespace/line endings
const oldInterfacePattern = /interface ResultsProps \{\s*result: ComparisonResult;\s*\}/;
const newInterface = "interface ResultsProps {\n  result: ComparisonResult;\n  onSaved?: () => void;\n}";

if (oldInterfacePattern.test(content)) {
  content = content.replace(oldInterfacePattern, newInterface);
  console.log('Interface updated');
} else {
  console.log('Interface NOT FOUND');
}

// Update the Results component - be more flexible with whitespace
const oldResultsPattern = /export const Results: React\.FC<ResultsProps> = \(\{ result \}\) => \{[\s\S]*?<CategoryBreakdown result=\{result\} \/>[\s\S]*?<div className="results-footer card">/;

const newResultsCode = `export const Results: React.FC<ResultsProps> = ({ result, onSaved }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(isComparisonSaved(result.comparisonId));
  }, [result.comparisonId]);

  const handleSave = () => {
    saveComparisonLocal(result);
    setIsSaved(true);
    setSaveMessage('Comparison saved!');
    setTimeout(() => setSaveMessage(null), 3000);
    onSaved?.();
  };

  return (
    <div className="results animate-slideUp">
      <WinnerHero result={result} />
      <ScoreGrid result={result} />
      <CategoryBreakdown result={result} />

      {/* Save Button */}
      <div className="save-comparison-bar">
        {saveMessage && (
          <span className="save-message">{saveMessage}</span>
        )}
        <button
          className={\`btn save-btn \${isSaved ? 'saved' : ''}\`}
          onClick={handleSave}
          disabled={isSaved}
        >
          {isSaved ? '✓ Saved' : '💾 Save Comparison'}
        </button>
      </div>

      <div className="results-footer card">`;

if (oldResultsPattern.test(content)) {
  content = content.replace(oldResultsPattern, newResultsCode);
  console.log('Results component updated');
} else {
  console.log('Results component pattern NOT FOUND');
}

fs.writeFileSync(filePath, content);
console.log('File saved');
