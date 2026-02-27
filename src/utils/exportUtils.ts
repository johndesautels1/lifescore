/**
 * Export Utilities for LIFE SCORE™
 * CSV and PDF export functionality
 */

import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import { CATEGORIES } from '../shared/metrics';
import { getMetricDisplayName } from '../shared/metricDisplayNames';

/**
 * Export comparison result to CSV format
 */
export function exportToCSV(result: EnhancedComparisonResult): void {
  const rows: string[][] = [];

  // Header
  rows.push([
    'Category',
    'Metric',
    `${result.city1.city} Score`,
    `${result.city2.city} Score`,
    'Difference',
    'Winner',
    'LLM Agreement',
    'Data Quality'
  ]);

  // Add metrics by category
  result.city1.categories.forEach((category, catIndex) => {
    const categoryName = CATEGORIES.find(c => c.id === category.categoryId)?.name || category.categoryId;
    const city2Category = result.city2.categories[catIndex];

    category.metrics.forEach((metric, metricIndex) => {
      const city2Metric = city2Category.metrics[metricIndex];
      // Handle null scores - skip metrics with missing data
      const score1 = metric.consensusScore ?? 0;
      const score2 = city2Metric.consensusScore ?? 0;
      const diff = score1 - score2;
      const winner = diff > 0 ? result.city1.city : diff < 0 ? result.city2.city : 'Tie';

      // Determine agreement level
      let agreement = 'Unknown';
      const stdDev = metric.standardDeviation ?? 0;
      if (stdDev <= 5) agreement = '5/5 High';
      else if (stdDev <= 10) agreement = '4/5 Good';
      else if (stdDev <= 15) agreement = '3/5 Moderate';
      else agreement = '2/5 Split';

      // Determine data quality based on confidence
      let dataQuality = 'Medium';
      if (metric.confidenceLevel === 'unanimous' || metric.confidenceLevel === 'strong') {
        dataQuality = 'High';
      } else if (metric.confidenceLevel === 'split' || metric.confidenceLevel === 'no_data') {
        dataQuality = 'Low';
      }

      rows.push([
        categoryName,
        getMetricDisplayName(metric.metricId),
        Math.round(score1).toString(),
        Math.round(score2).toString(),
        (diff > 0 ? '+' : '') + Math.round(diff).toString(),
        winner,
        agreement,
        dataQuality
      ]);
    });
  });

  // Add summary row
  rows.push([]);
  rows.push(['SUMMARY']);
  rows.push(['Total Score', '', result.city1.totalConsensusScore.toString(), result.city2.totalConsensusScore.toString()]);
  rows.push(['Winner', '', result.winner === 'city1' ? result.city1.city : result.winner === 'city2' ? result.city2.city : 'Tie']);
  rows.push(['Score Difference', '', Math.abs(result.scoreDifference).toString()]);
  rows.push(['Generated', '', new Date(result.generatedAt).toLocaleString()]);

  // Convert to CSV string
  const csvContent = rows.map(row =>
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifescore-${result.city1.city}-vs-${result.city2.city}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export comparison result to PDF format
 * Uses browser print functionality for simplicity
 */
export function exportToPDF(result: EnhancedComparisonResult): void {
  const winner = result.winner === 'city1' ? result.city1 : result.city2;
  const delta = Math.abs(result.scoreDifference);

  // Build HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>LIFE SCORE - ${result.city1.city} vs ${result.city2.city}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #0047AB;
        }
        .logo { font-size: 32px; margin-bottom: 5px; }
        .title {
          font-size: 28px;
          color: #0047AB;
          font-weight: 800;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
          margin-top: 5px;
        }
        .winner-section {
          background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%);
          border: 2px solid #0047AB;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
          text-align: center;
        }
        .winner-badge {
          display: inline-block;
          background: linear-gradient(135deg, #D4AF37 0%, #F7931E 100%);
          color: white;
          padding: 8px 20px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 15px;
        }
        .scores {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin: 20px 0;
        }
        .score-box {
          text-align: center;
        }
        .city-name {
          font-size: 18px;
          font-weight: 700;
          color: #333;
        }
        .score-value {
          font-size: 48px;
          font-weight: 800;
          color: #0047AB;
        }
        .score-value.winner {
          color: #D4AF37;
        }
        .delta-badge {
          display: inline-block;
          background: #0047AB;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          margin-top: 10px;
        }
        .delta-value {
          color: #D4AF37;
        }
        .categories-section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          color: #0047AB;
          font-weight: 700;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        th {
          background: #0047AB;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        tr:nth-child(even) {
          background: #f8f9fa;
        }
        .winner-cell {
          color: #059669;
          font-weight: 600;
        }
        .loser-cell {
          color: #666;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          font-size: 11px;
          color: #666;
          text-align: center;
        }
        .footer-brand {
          font-weight: 700;
          color: #0047AB;
        }
        @media print {
          body { padding: 20px; }
          .no-break { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🗽</div>
        <div class="title">LIFE SCORE™</div>
        <div class="subtitle">Legal Independence & Freedom Evaluation</div>
      </div>

      <div class="winner-section">
        <div class="winner-badge">🏆 WINNER</div>
        <div class="scores">
          <div class="score-box">
            <div class="city-name">${result.city1.city}</div>
            <div class="score-value ${result.winner === 'city1' ? 'winner' : ''}">${result.city1.totalConsensusScore}</div>
          </div>
          <div class="score-box" style="align-self: center; font-size: 24px; color: #999;">VS</div>
          <div class="score-box">
            <div class="city-name">${result.city2.city}</div>
            <div class="score-value ${result.winner === 'city2' ? 'winner' : ''}">${result.city2.totalConsensusScore}</div>
          </div>
        </div>
        <div class="delta-badge">
          ⚡ <span class="delta-value">+${delta}</span> Freedom Delta for ${winner.city}
        </div>
      </div>

      <div class="categories-section">
        <div class="section-title">Category Summary</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>${result.city1.city}</th>
              <th>${result.city2.city}</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            ${result.city1.categories.map((cat, i) => {
              const cat2 = result.city2.categories[i];
              const catName = CATEGORIES.find(c => c.id === cat.categoryId)?.name || cat.categoryId;
              const score1 = cat.averageConsensusScore ?? 0;
              const score2 = cat2.averageConsensusScore ?? 0;
              const catWinner = score1 > score2 ? result.city1.city :
                               score1 < score2 ? result.city2.city : 'Tie';
              return `
                <tr>
                  <td>${catName}</td>
                  <td class="${score1 > score2 ? 'winner-cell' : 'loser-cell'}">${Math.round(score1)}</td>
                  <td class="${score2 > score1 ? 'winner-cell' : 'loser-cell'}">${Math.round(score2)}</td>
                  <td>${catWinner}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- DETAILED METRIC TABLES BY CATEGORY -->
      ${result.city1.categories.map((cat, catIndex) => {
        const cat2 = result.city2.categories[catIndex];
        const catInfo = CATEGORIES.find(c => c.id === cat.categoryId);
        const catName = catInfo?.name || cat.categoryId;
        const catIcon = catInfo?.icon || '📊';

        return `
          <div class="category-detail no-break" style="margin-top: 30px; page-break-inside: avoid;">
            <div class="section-title">${catIcon} ${catName}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%;">Metric</th>
                  <th style="width: 15%;">${result.city1.city}</th>
                  <th style="width: 15%;">${result.city2.city}</th>
                  <th style="width: 10%;">Diff</th>
                  <th style="width: 30%;">Analysis</th>
                </tr>
              </thead>
              <tbody>
                ${cat.metrics.map((metric, metricIndex) => {
                  const metric2 = cat2.metrics[metricIndex];
                  const score1 = metric.consensusScore ?? 0;
                  const score2 = metric2.consensusScore ?? 0;
                  const diff = score1 - score2;
                  const diffStr = diff > 0 ? '+' + Math.round(diff) : Math.round(diff).toString();
                  // Get reasoning from first LLM score if available
                  const reasoning = (metric as any).llmScores?.[0]?.reasoning || '';
                  const shortReasoning = reasoning.length > 150 ? reasoning.substring(0, 150) + '...' : reasoning;

                  return `
                    <tr>
                      <td><strong>${getMetricDisplayName(metric.metricId)}</strong></td>
                      <td class="${score1 >= score2 ? 'winner-cell' : 'loser-cell'}">${Math.round(score1)}</td>
                      <td class="${score2 >= score1 ? 'winner-cell' : 'loser-cell'}">${Math.round(score2)}</td>
                      <td style="color: ${diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#666'};">${diffStr}</td>
                      <td style="font-size: 10px; color: #555;">${shortReasoning}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div style="text-align: right; font-size: 11px; color: #666; margin-top: 5px;">
              Category Average: ${result.city1.city} <strong>${Math.round(cat.averageConsensusScore ?? 0)}</strong> |
              ${result.city2.city} <strong>${Math.round(cat2.averageConsensusScore ?? 0)}</strong>
            </div>
          </div>
        `;
      }).join('')}

      <!-- LLM CONSENSUS ANALYSIS -->
      <div class="no-break" style="margin-top: 30px; page-break-inside: avoid;">
        <div class="section-title">🤖 AI Model Consensus</div>
        <table>
          <thead>
            <tr>
              <th>AI Model</th>
              <th>Status</th>
              <th>Metrics Evaluated</th>
            </tr>
          </thead>
          <tbody>
            ${result.llmsUsed.map(llm => `
              <tr>
                <td><strong>${llm}</strong></td>
                <td style="color: #059669;">✓ Completed</td>
                <td>${result.processingStats.metricsEvaluated}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 10px; font-size: 11px; color: #666;">
          Total Processing Time: ${(result.processingStats.totalTimeMs / 1000).toFixed(1)}s |
          Metrics Evaluated: ${result.processingStats.metricsEvaluated}
        </div>
      </div>

      <div class="footer">
        <div class="footer-brand">LIFE SCORE™ by Clues Intelligence LTD</div>
        <div>Part of the CLUES™ Platform</div>
        <div style="margin-top: 10px;">
          Generated: ${new Date(result.generatedAt).toLocaleString()} |
          ${result.llmsUsed.length} AI Models |
          ${result.processingStats.metricsEvaluated} Metrics Evaluated
        </div>
        <div style="margin-top: 5px;">Comparison ID: ${result.comparisonId}</div>
      </div>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
