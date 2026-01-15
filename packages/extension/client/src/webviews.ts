import { MdfData, parseMdf } from './mdf';
import * as vscode from "vscode";

export function createMdfWebviewPanel(content: string, title: string): vscode.WebviewPanel {
	const parsedData: MdfData = parseMdf(content);
	const panel = vscode.window.createWebviewPanel(
		'modelPlot',
		`Model Plot: ${title}`,
		vscode.ViewColumn.One,
		{ enableScripts: true }
	);
	panel.webview.html = getMdfWebviewContent();
	const plotData = { amodel: parsedData.a ? { x: parsedData.a.map((val, idx) => (idx * parsedData.nsecs)) || [], y: parsedData.a || [] } : undefined, bmodel: parsedData.b ? { x: parsedData.b.map((val, idx) => (idx * parsedData.nsecs)) || [], y: parsedData.b || [] } : undefined, title: title };
	panel.webview.postMessage({ type: 'plot', data: plotData });
	return panel;
}

function getMdfWebviewContent(): string {
	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="color-scheme" content="light dark">
      <title>Model Plot</title>
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      <style>
        body {
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        #plot {
          width: 95vw;
          height: 95vh;
        }
      </style>
    </head>
    <body>
      <div id="plot"></div>
      <script>
        // Set Plotly background to match VS Code theme
        function getPlotlyLayout(title, data) {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const gridColor = isDark ? '#888' : '#ccc';
          // Compute min/max y from all traces
          let yMin = 0, yMax = 0;
          if (data && data.length > 0) {
            let allY = [];
            data.forEach(trace => {
              if (Array.isArray(trace.y)) {
                allY = allY.concat(trace.y);
              }
            });
            if (allY.length > 0) {
              yMin = Math.min(0, ...allY);
              yMax = Math.max(0, ...allY);
            }
          }
          return {
            title: title || 'Model Plot',
            paper_bgcolor: getComputedStyle(document.body).backgroundColor,
            plot_bgcolor: getComputedStyle(document.body).backgroundColor,
            font: { color: getComputedStyle(document.body).color },
            xaxis: { gridcolor: gridColor, title: { text: 'Time (s)' } },
            yaxis: { gridcolor: gridColor, range: [yMin, yMax] }
          };
        }
        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'plot') {
            const data = [];
            if (message.data.amodel) {
              data.push({
                x: message.data.amodel.x,
                y: message.data.amodel.y,
                type: 'scatter',
                name: 'A Model',
                line: { color: 'red' }
              });
            }
            if (message.data.bmodel) {
              data.push({
                x: message.data.bmodel.x,
                y: message.data.bmodel.y,
                type: 'scatter',
                name: 'B Model',
                line: { color: 'blue' }
              });
            }
            const layout = getPlotlyLayout(message.data.title, data);
            Plotly.newPlot('plot', data, layout);
          }
        });
      </script>
    </body>
    </html>
  `;
}