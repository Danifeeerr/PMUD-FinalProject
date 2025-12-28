const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Para servir archivos estáticos (HTML, CSS, JS, imágenes)

// Ruta del archivo de base de datos
const DB_FILE = path.join(__dirname, 'db_videogames.json');

// Función para leer la base de datos
function readDB() {
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

// Función para escribir en la base de datos
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Función para generar un nuevo ID
function getNextId(array) {
  if (array.length === 0) return "1";
  const maxId = Math.max(...array.map(item => parseInt(item.id)));
  return String(maxId + 1);
}

// ============ USERS ============

// GET /users - Obtener usuarios (con filtro opcional por username)
app.get('/users', (req, res) => {
  const db = readDB();
  const { username } = req.query;
  
  if (username) {
    const filtered = db.users.filter(u => u.username === username);
    return res.json(filtered);
  }
  
  res.json(db.users);
});

// POST /users - Crear usuario
app.post('/users', (req, res) => {
  const db = readDB();
  const newUser = {
    id: getNextId(db.users),
    username: req.body.username,
    password: req.body.password
  };
  
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

// ============ VIDEOGAMES ============

// GET /videogames - Obtener todos los videojuegos
app.get('/videogames', (req, res) => {
  const db = readDB();
  res.json(db.videogames);
});

// GET /videogames/:id - Obtener un videojuego por ID
app.get('/videogames/:id', (req, res) => {
  const db = readDB();
  const videogame = db.videogames.find(v => v.id === req.params.id);
  
  if (!videogame) {
    return res.status(404).json({ error: 'Videogame not found' });
  }
  
  res.json(videogame);
});

// POST /videogames - Crear videojuego (opcional, para admin)
app.post('/videogames', (req, res) => {
  const db = readDB();
  const newVideogame = {
    id: getNextId(db.videogames),
    title: req.body.title,
    release_year: req.body.release_year
  };
  
  db.videogames.push(newVideogame);
  writeDB(db);
  res.status(201).json(newVideogame);
});

// ============ LISTS ============

// GET /lists - Obtener listas (con filtro opcional por userid)
app.get('/lists', (req, res) => {
  const db = readDB();
  const { userid } = req.query;
  
  if (userid) {
    const filtered = db.lists.filter(l => l.userid === userid);
    return res.json(filtered);
  }
  
  res.json(db.lists);
});

// GET /lists/:id - Obtener una lista por ID
app.get('/lists/:id', (req, res) => {
  const db = readDB();
  const list = db.lists.find(l => l.id === req.params.id);
  
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }
  
  res.json(list);
});

// POST /lists - Crear lista
app.post('/lists', (req, res) => {
  const db = readDB();
  const newList = {
    id: getNextId(db.lists),
    userid: req.body.userid,
    listname: req.body.listname
  };
  
  db.lists.push(newList);
  writeDB(db);
  res.status(201).json(newList);
});

// DELETE /lists/:id - Eliminar lista
app.delete('/lists/:id', (req, res) => {
  const db = readDB();
  const listIndex = db.lists.findIndex(l => l.id === req.params.id);
  
  if (listIndex === -1) {
    return res.status(404).json({ error: 'List not found' });
  }
  
  // Eliminar también las relaciones videogames_lists
  db.videogames_lists = db.videogames_lists.filter(vl => vl.listid !== req.params.id);
  
  db.lists.splice(listIndex, 1);
  writeDB(db);
  res.status(204).send();
});

// ============ VIDEOGAMES_LISTS ============

// GET /videogames_lists - Obtener relaciones (con filtro opcional y expand)
app.get('/videogames_lists', (req, res) => {
  const db = readDB();
  const { listid, _expand } = req.query;
  
  let filtered = db.videogames_lists;
  
  if (listid) {
    filtered = filtered.filter(vl => vl.listid === listid);
  }
  
  // Expand videogame
  if (_expand === 'videogame') {
    filtered = filtered.map(vl => {
      const videogame = db.videogames.find(v => v.id === vl.videogameid);
      return { ...vl, videogame };
    });
  }
  
  res.json(filtered);
});

// POST /videogames_lists - Añadir videojuego a lista
app.post('/videogames_lists', (req, res) => {
  const db = readDB();
  const newRelation = {
    id: getNextId(db.videogames_lists),
    videogameid: req.body.videogameid,
    listid: req.body.listid
  };
  
  db.videogames_lists.push(newRelation);
  writeDB(db);
  res.status(201).json(newRelation);
});

// DELETE /videogames_lists/:id - Eliminar videojuego de lista
app.delete('/videogames_lists/:id', (req, res) => {
  const db = readDB();
  const relationIndex = db.videogames_lists.findIndex(vl => vl.id === req.params.id);
  
  if (relationIndex === -1) {
    return res.status(404).json({ error: 'Relation not found' });
  }
  
  db.videogames_lists.splice(relationIndex, 1);
  writeDB(db);
  res.status(204).send();
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});