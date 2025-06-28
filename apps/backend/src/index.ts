import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(express.json());

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from backend!');
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Export the app for testing purposes
export default app;