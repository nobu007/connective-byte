import express, { Request, Response } from 'express';

const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Press Ctrl-C to stop the server');
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('Closing server...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});