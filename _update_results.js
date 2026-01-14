const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Results.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldSection = `interface ResultsProps {
  result: ComparisonResult;
}

export const Results: React.FC<ResultsProps> = ({ result }) => {
  return (
    <div className="results animate-slideUp">
      <WinnerHero result={result} />
      <ScoreGrid result={result} />
      <CategoryBreakdown result={result} />
      
      <div className="results-footer card">`;

const newSection = `interface ResultsProps {
  result: ComparisonResult;
  onSaved?: () => void;
}

export const Results: React.FC<ResultsProps> = ({ result, onSaved }) => {
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

content = content.replace(oldSection, newSection);
fs.writeFileSync(filePath, content);
console.log('Results.tsx updated successfully');
