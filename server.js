import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameTree } from './public/src/gameTree.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Правильно обрабатываем модули JavaScript
app.get('/src/:file', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'src', req.params.file), {
    headers: {
      'Content-Type': 'application/javascript'
    }
  });
});

// API endpoints
app.post('/api/solve', express.json(), (req, res) => {
  try {
    const gameTree = new GameTree();
    gameTree.loadFromJSON(req.body);
    const solution = gameTree.solve();
    res.json({ success: true, solution });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Все остальные запросы отправляем на index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});