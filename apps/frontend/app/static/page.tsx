import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Static Page',
};

export default function StaticPage() {
  return (
    <div className="container">
      <h1>Static Page</h1>
      <p>This is a static page.</p>
    </div>
  );
}