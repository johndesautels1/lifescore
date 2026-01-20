const fs = require('fs');
let content = fs.readFileSync('MASTER_README.md', 'utf8');

const newSection = `---

## REMAINING ISSUES FROM SESSION DELTA (For Next Session)

### URGENT UI FIXES NEEDED

| # | Issue | Priority | Details |
|---|-------|----------|---------|
| U1 | About Card Text White | HIGH | Text in About Enhanced Comparison card needs crisp white color on blue gradient background |
| U2 | Scoring Explanation Collapsible | HIGH | Make How Our Scoring Works section collapsible, default to collapsed state |
| U3 | Disagreement Areas Bullet Format | HIGH | Format disagreement areas as bullet points with readable metric names (not field IDs like pf_08_euthanasia_status) |
| U4 | Top 5 Deciding Factors Widget | HIGH | Restore clickable widget on each metric showing WHY each city won/lost on that specific metric |
| U5 | Save Report Button | MEDIUM | Add save/export functionality on advanced comparison page (task C6) |

### CONTEXT FOR U4 (Top 5 Deciding Factors Widget)

The user reports that each metric in Top 5 Deciding Factors should have a clickable widget showing:
- Why the winning city scored higher
- Why the losing city scored lower
- The judge's explanation for that metric

Data exists in MetricConsensus.judgeExplanation and llmScores[].explanation but is not displayed.

Files to modify:
- src/components/EnhancedComparison.tsx - Add explanation to MetricDifference, update calculateTopDifferences, add expandable UI
- src/components/EnhancedComparison.css - Style the expandable explanation widget

---

## COMPRESSION PROTOCOL`;

content = content.replace(/---\s*\n\s*## COMPRESSION PROTOCOL/, newSection);
fs.writeFileSync('MASTER_README.md', content);
console.log('File updated successfully');
