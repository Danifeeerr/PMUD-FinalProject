const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'db_videogames.json');

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
const getNextId = (array) => String(array.length ? Math.max(...array.map(i => parseInt(i.id))) + 1 : 1);

const getAll = (collection, filter) => {
  const db = readDB();
  return filter ? db[collection].filter(filter) : db[collection];
};

const getById = (collection, id) => {
  const db = readDB();
  return db[collection].find(item => item.id === id);
};

const create = (collection, data) => {
  const db = readDB();
  const newItem = { id: getNextId(db[collection]), ...data };
  db[collection].push(newItem);
  writeDB(db);
  return newItem;
};

const deleteById = (collection, id, cascade) => {
  const db = readDB();
  const index = db[collection].findIndex(item => item.id === id);
  if (index === -1) return false;
  
  db[collection].splice(index, 1);
  if (cascade) cascade(db, id);
  writeDB(db);
  return true;
};

// Users
app.get('/users', (req, res) => {
  const users = getAll('users', req.query.username ? u => u.username === req.query.username : null);
  res.json(users);
});

app.post('/users', (req, res) => {
  const user = create('users', { username: req.body.username, password: req.body.password });
  res.status(201).json(user);
});

// Videogames
app.get('/videogames', (req, res) => res.json(getAll('videogames')));


// Lists
app.get('/lists', (req, res) => {
  const lists = getAll('lists', req.query.userid ? l => l.userid === req.query.userid : null);
  res.json(lists);
});

app.get('/lists/:id', (req, res) => {
  const list = getById('lists', req.params.id);
  list ? res.json(list) : res.status(404).json({ error: 'Not found' });
});

app.post('/lists', (req, res) => {
  const list = create('lists', { userid: req.body.userid, listname: req.body.listname });
  res.status(201).json(list);
});

app.delete('/lists/:id', (req, res) => {
  const deleted = deleteById('lists', req.params.id, (db, id) => {
    db.videogames_lists = db.videogames_lists.filter(vl => vl.listid !== id);
  });
  deleted ? res.status(204).send() : res.status(404).json({ error: 'Not found' });
});

// Videogames_lists
app.get('/videogames_lists', (req, res) => {
  const db = readDB();
  let items = db.videogames_lists;
  
  if (req.query.listid) {
    items = items.filter(vl => vl.listid === req.query.listid);
  }
  
  if (req.query._expand === 'videogame') {
    items = items.map(vl => ({
      ...vl,
      videogame: db.videogames.find(v => v.id === vl.videogameid)
    }));
  }
  
  res.json(items);
});

app.post('/videogames_lists', (req, res) => {
  const relation = create('videogames_lists', {
    videogameid: req.body.videogameid,
    listid: req.body.listid
  });
  res.status(201).json(relation);
});

app.delete('/videogames_lists/:id', (req, res) => {
  const deleted = deleteById('videogames_lists', req.params.id);
  deleted ? res.status(204).send() : res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});