import fs from 'fs';
import path from 'path';

export default function StaticPage() {
  const htmlContent = fs.readFileSync(path.join(process.cwd(), 'app/static/output.html'), 'utf8');

  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}