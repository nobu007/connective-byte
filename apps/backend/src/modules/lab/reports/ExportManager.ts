/**
 * Export Manager
 * Handles report export in various formats
 */

import { ExperimentReport, ExportFormat, ExportOptions } from './types';

export class ExportManager {
  public async export(report: ExperimentReport, options: ExportOptions): Promise<Buffer | string> {
    switch (options.format) {
      case 'json':
        return this.exportJSON(report, options);
      case 'html':
        return this.exportHTML(report, options);
      case 'pdf':
        return this.exportPDF(report, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private exportJSON(report: ExperimentReport, options: ExportOptions): string {
    const data = options.includeRawData
      ? report
      : {
          ...report,
          visualizations: options.includeVisualizations ? report.visualizations : [],
        };

    return JSON.stringify(data, null, 2);
  }

  private exportHTML(report: ExperimentReport, options: ExportOptions): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.experimentName} - 実験レポート</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .section {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric {
      display: inline-block;
      margin: 10px 20px 10px 0;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .savings {
      color: #10b981;
    }
    .recommendation {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${report.experimentName}</h1>
    <p>実験ID: ${report.experimentId}</p>
    <p>生成日時: ${report.generatedAt.toLocaleString('ja-JP')}</p>
  </div>

  <div class="section">
    <h2>📊 サマリー</h2>
    <div class="metric">
      <div class="metric-label">総コスト</div>
      <div class="metric-value">$${report.summary.totalCost.toFixed(4)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">コスト削減</div>
      <div class="metric-value savings">${report.summary.costSavingsPercentage.toFixed(1)}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">総トークン数</div>
      <div class="metric-value">${report.summary.totalTokens.toLocaleString()}</div>
    </div>
    <div class="metric">
      <div class="metric-label">平均レイテンシ</div>
      <div class="metric-value">${report.summary.averageLatency}ms</div>
    </div>
  </div>

  <div class="section">
    <h2>🎯 ベースライン</h2>
    <table>
      <tr>
        <th>シナリオ</th>
        <th>平均コスト</th>
        <th>総トークン数</th>
        <th>平均レイテンシ</th>
        <th>呼び出し回数</th>
      </tr>
      <tr>
        <td>${report.baseline.scenario}</td>
        <td>$${report.baseline.averageCost.toFixed(6)}</td>
        <td>${report.baseline.totalTokens.toLocaleString()}</td>
        <td>${report.baseline.averageLatency}ms</td>
        <td>${report.baseline.callCount}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>⚡ 最適化戦略</h2>
    <table>
      <tr>
        <th>戦略</th>
        <th>説明</th>
        <th>適用</th>
        <th>推定削減額</th>
      </tr>
      ${report.optimizations
        .map(
          (opt) => `
        <tr>
          <td>${opt.strategyName}</td>
          <td>${opt.description}</td>
          <td>${opt.applied ? '✅' : '❌'}</td>
          <td>$${opt.estimatedSavings.toFixed(6)}</td>
        </tr>
      `
        )
        .join('')}
    </table>
  </div>

  <div class="section">
    <h2>📈 結果</h2>
    <p><strong>コスト削減:</strong> ${report.results.improvementMetrics.costReduction.toFixed(2)}%</p>
    <p><strong>トークン削減:</strong> ${report.results.improvementMetrics.tokenReduction.toFixed(2)}%</p>
    <p><strong>レイテンシ改善:</strong> ${report.results.improvementMetrics.latencyImprovement.toFixed(2)}%</p>
    <p><strong>統計的有意性:</strong> ${report.results.statisticalSignificance ? '✅ あり' : '❌ なし'}</p>
  </div>

  <div class="section">
    <h2>💡 推奨事項</h2>
    ${report.recommendations
      .map(
        (rec) => `
      <div class="recommendation">${rec}</div>
    `
      )
      .join('')}
  </div>
</body>
</html>
    `.trim();
  }

  private async exportPDF(report: ExperimentReport, options: ExportOptions): Promise<Buffer> {
    // For now, return HTML as buffer
    // In production, use a library like puppeteer or pdfkit
    const html = this.exportHTML(report, options);
    return Buffer.from(html, 'utf-8');
  }
}
