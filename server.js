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


function readDB() {
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}


function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getNextId(array) {
  if (array.length === 0) return "1";
  const maxId = Math.max(...array.map(item => parseInt(item.id)));
  return String(maxId + 1);
}


app.get('/users', (req, res) => {
  const db = readDB();
  const { username } = req.query;
  
  if (username) {
    const filtered = db.users.filter(u => u.username === username);
    return res.json(filtered);
  }
  
  res.json(db.users);
});


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


app.get('/videogames', (req, res) => {
  const db = readDB();
  res.json(db.videogames);
});


app.get('/videogames/:id', (req, res) => {
  const db = readDB();
  const videogame = db.videogames.find(v => v.id === req.params.id);
  
  if (!videogame) {
    return res.status(404).json({ error: 'Videogame not found' });
  }
  
  res.json(videogame);
});

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

app.get('/lists', (req, res) => {
  const db = readDB();
  const { userid } = req.query;
  
  if (userid) {
    const filtered = db.lists.filter(l => l.userid === userid);
    return res.json(filtered);
  }
  
  res.json(db.lists);
});


app.get('/lists/:id', (req, res) => {
  const db = readDB();
  const list = db.lists.find(l => l.id === req.params.id);
  
  if (!list) {
    return res.status(404).json({ error: 'List not found' });
  }
  
  res.json(list);
});

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


app.delete('/lists/:id', (req, res) => {
  const db = readDB();
  const listIndex = db.lists.findIndex(l => l.id === req.params.id);
  
  if (listIndex === -1) {
    return res.status(404).json({ error: 'List not found' });
  }
  

  db.videogames_lists = db.videogames_lists.filter(vl => vl.listid !== req.params.id);
  
  db.lists.splice(listIndex, 1);
  writeDB(db);
  res.status(204).send();
});

app.get('/videogames_lists', (req, res) => {
  const db = readDB();
  const { listid, _expand } = req.query;
  
  let filtered = db.videogames_lists;
  
  if (listid) {
    filtered = filtered.filter(vl => vl.listid === listid);
  }
  
  if (_expand === 'videogame') {
    filtered = filtered.map(vl => {
      const videogame = db.videogames.find(v => v.id === vl.videogameid);
      return { ...vl, videogame };
    });
  }
  
  res.json(filtered);
});

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


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});