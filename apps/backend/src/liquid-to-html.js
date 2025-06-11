const { Liquid } = require('liquidjs');
const fs = require('fs');
const path = require('path');

const liquid = new Liquid();

const templatePath = path.join(__dirname, '../../frontend/app/static/template.liquid');
const dataPath = path.join(__dirname, '../../frontend/app/static/data.json');
const outputPath = path.join(__dirname, '../../frontend/app/static/output.html');

async function renderLiquidTemplate() {
    try {
        const template = await fs.promises.readFile(templatePath, 'utf8');
        const data = JSON.parse(await fs.promises.readFile(dataPath, 'utf8'));
        const html = await liquid.parseAndRender(template, data);
        await fs.promises.writeFile(outputPath, html);
        console.log('Liquid template rendered successfully to', outputPath);
    } catch (error) {
        console.error('Error rendering Liquid template:', error);
    }
}

renderLiquidTemplate();