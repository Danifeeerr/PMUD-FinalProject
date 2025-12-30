/*jshint esversion: 6 */
$(function() {
  const API = "http://localhost:3000";
  let username = localStorage.getItem("username") || "";
  let userId = parseInt(localStorage.getItem("userId"));
  let videogames, lists, listId, listGames, isNewListMode = false;


async function api(endpoint, options = {}) {
  const response = await fetch(`${API}${endpoint}`, {
    headers: {'Content-Type': 'application/json'},
    ...options
  });
  if (!response.ok) throw new Error(response.statusText);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const showError = (msg) => {
  $('#header>.message').html(msg);
  setTimeout(() => $('#header>.message').html(""), 5000);
};

const toggle = (show, hide) => {
  $(show.join(',')).show();
  $(hide.join(',')).hide();
};

const renderLists = (lists) => lists.map(l => `
  <div class="list-card" data-id="${l.id}">
    <div class="list-card-header">
      <h3>${l.listname}</h3>
      <img class="delete" data-id="${l.id}" src="public/icon_delete.png"/>
    </div>
    <div class="list-card-footer">Click to view games</div>
  </div>`).join('');

const renderGames = (games) => games.map(g => `
  <div class="videogame-card" data-id="${g.id}">
    <span>${g.title}</span>
    <span class="year">${g.release_year}</span>
  </div>`).join('');

const renderListGames = (listGames) => listGames.length ? listGames.map(lg => `
  <div class="popup-game-item" data-id="${lg.id}">
    <div class="game-info">
      <span class="game-title">${lg.videogame.title}</span>
      <span class="game-year">${lg.videogame.release_year}</span>
    </div>
    <img class="remove" data-id="${lg.id}" src="public/icon_delete.png"/>
  </div>`).join('') : '<p class="empty-list">No games yet</p>';

const popups = {
  open: (id, callback) => {
    $(`#${id}`).show();
    $('body').css('overflow', 'hidden');
    callback?.();
  },
  close: (id, cleanup) => {
    $(`#${id}`).hide();
    $('body').css('overflow', 'auto');
    cleanup?.();
  },
  closeAll: () => {
    $('.popup-overlay').hide();
    $('body').css('overflow', 'auto');
    listId = undefined;
  }
};

const confirm = (message, onYes) => {
  $('#confirm-popup-message').text(message);
  $('#confirm-popup-overlay').data('onConfirm', onYes).show();
};

async function login(isCreate) {
  username = $('#header>input.username').val();
  const password = $('#header>input.password').val();
  
  if (!username || !password) return showError("Missing credentials");

  try {
    const users = await api(`/users?username=${username}`);
    
    if (users.length === 0) {
      if (!isCreate) return showError("Wrong credentials");
      const user = await api('/users', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      userId = user.id;
    } else {
      if (isCreate) return showError("Username exists");
      if (users[0].password !== password) return showError("Wrong credentials");
      userId = users[0].id;
    }
    
    localStorage.setItem("username", username);
    localStorage.setItem("userId", userId);
    
    toggle(['#header>.logout', '#header>.username-display', '#lists'], 
           ['#header>input', '#header>button.login', '#header>button.create']);
    $('#header>.username-display').text(username);
    loadLists();
  } catch (error) {
    showError("Connection error");
  }
}

function logout() {
  userId = undefined;
  username = "";
  localStorage.clear();
  toggle(['#header>input', '#header>button.login', '#header>button.create'],
         ['#header>.logout', '#header>.username-display', '#lists']);
  $('#header>input').val('');
  popups.closeAll();
}

async function loadLists() {
  try {
    lists = await api(`/lists?userid=${userId}`);
    $('#lists>.content').html(renderLists(lists));
    toggle(['.new_list'], ['.add_list', '.cancel_list']);
    $('.search').val('');
    isNewListMode = false;
    popups.close('popup-overlay');
    $('#add-games-button').hide();
  } catch (error) {
    showError(error.message);
  }
}

async function deleteList(id) {
  const list = lists.find(l => l.id == id);
  confirm(`Delete "${list.listname}"?`, async () => {
    try {
      await api(`/lists/${id}`, { method: 'DELETE' });
      lists = lists.filter(l => l.id != id);
      $('#lists>.content').html(renderLists(lists));
      if (listId == id) popups.close('popup-overlay');
    } catch (error) {
      showError(error.message);
    }
  });
}

async function startNewList() {
  try {
    videogames = await api('/videogames');
    videogames.sort((a, b) => a.title.localeCompare(b.title));
    $('#lists>.content').html(renderGames(videogames));
    toggle(['.add_list', '.cancel_list'], ['.new_list']);
    isNewListMode = true;
  } catch (error) {
    showError(error.message);
  }
}

async function saveNewList() {
  popups.open('name-popup-overlay', () => $('#list-name-input').val('').focus());
}

async function confirmListName() {
  const name = $('#list-name-input').val().trim();
  if (!name) return $('#name-popup-error').text('Enter a name').show();

  const gameIds = $('#lists .videogame-card.active').map((i, e) => $(e).data('id')).get();
  
  try {
    const list = await api('/lists', {
      method: 'POST',
      body: JSON.stringify({ userid: String(userId), listname: name })
    });
    
    if (gameIds.length) {
      await Promise.all(gameIds.map(id =>
        api('/videogames_lists', {
          method: 'POST',
          body: JSON.stringify({ listid: String(list.id), videogameid: String(id) })
        })
      ));
    }
    
    popups.close('name-popup-overlay');
    loadLists();
  } catch (error) {
    showError(error.message);
  }
}

function search(query) {
  const q = query.toLowerCase();
  if (isNewListMode) {
    const filtered = videogames.filter(g => g.title.toLowerCase().includes(q));
    $('#lists>.content').html(renderGames(filtered));
  } else {
    const filtered = lists.filter(l => l.listname.toLowerCase().includes(q));
    $('#lists>.content').html(renderLists(filtered));
  }
}

async function openList(id) {
  listId = id;
  const list = lists.find(l => l.id == id);
  $('#popup-title').text(list.listname);
  $('#add-games-button').show();
  popups.open('popup-overlay');
  $('.videogames-search').val('');
  loadListGames();
}

async function loadListGames() {
  try {
    listGames = await api(`/videogames_lists?_expand=videogame&listid=${listId}`);
    const query = $('.videogames-search').val().toLowerCase();
    const filtered = listGames.filter(lg => 
      lg.videogame.title.toLowerCase().includes(query)
    );
    $('.popup-content').html(renderListGames(filtered));
  } catch (error) {
    showError(error.message);
  }
}

async function removeGame(id) {
  confirm("Remove game?", async () => {
    try {
      await api(`/videogames_lists/${id}`, { method: 'DELETE' });
      listGames = listGames.filter(lg => lg.id != id);
      loadListGames();
    } catch (error) {
      showError(error.message);
    }
  });
}

async function openAddGames() {
  try {
    videogames = await api('/videogames');
    videogames.sort((a, b) => a.title.localeCompare(b.title));
    
    const existing = listGames.map(lg => lg.videogame.id);
    const available = videogames.filter(g => !existing.includes(g.id));
    
    $('#add-games-content').html(renderGames(available));
    popups.open('add-games-popup-overlay');
  } catch (error) {
    showError(error.message);
  }
}

async function addGames() {
  const gameIds = $('#add-games-content .videogame-card.active').map((i, e) => $(e).data('id')).get();
  if (!gameIds.length) return alert("Select games");
  
  try {
    await Promise.all(gameIds.map(id =>
      api('/videogames_lists', {
        method: 'POST',
        body: JSON.stringify({ listid: String(listId), videogameid: String(id) })
      })
    ));
    
    popups.close('add-games-popup-overlay');
    loadListGames();
  } catch (error) {
    showError(error.message);
  }
}

function searchAddGames(query) {
  const existing = listGames.map(lg => lg.videogame.id);
  const filtered = videogames.filter(g => 
    !existing.includes(g.id) && 
    g.title.toLowerCase().includes(query.toLowerCase())
  );
  $('#add-games-content').html(renderGames(filtered));
}

// EVENTS
$(document).on('keypress', '#header>input.password', (e) => {
  if (e.keyCode === 13) login(false);
});
$(document).on('click', '#header>.login', () => login(false));
$(document).on('click', '#header>.create', () => login(true));
$(document).on('click', '#header>.logout', logout);

$(document).on('click', '.new_list', startNewList);
$(document).on('click', '.add_list', saveNewList);
$(document).on('click', '.cancel_list', loadLists);

$(document).on('click', '.delete', (e) => {
  e.stopPropagation();
  deleteList($(e.currentTarget).data('id'));
});

$(document).on('input', '.search', (e) => search($(e.target).val()));
$(document).on('click', '.dsearch', () => {
  $('.search').val('');
  search('');
});

$(document).on('click', '.list-card', (e) => {
  if (!$(e.target).hasClass('delete')) openList($(e.currentTarget).data('id'));
});

$(document).on('click', '.videogame-card', (e) => $(e.currentTarget).toggleClass('active'));

$(document).on('input', '.videogames-search', loadListGames);
$(document).on('click', '.videogames-dsearch', () => {
  $('.videogames-search').val('');
  loadListGames();
});
$(document).on('click', '.remove', (e) => removeGame($(e.currentTarget).data('id')));
$(document).on('click', '.popup-close', () => {
  popups.close('popup-overlay');
  listId = undefined;
  $('#add-games-button').hide();
});
$(document).on('click', '#popup-overlay', (e) => {
  if (e.target.id === 'popup-overlay') {
    popups.close('popup-overlay');
    listId = undefined;
    $('#add-games-button').hide();
  }
});

$(document).on('click', '#add-games-button', openAddGames);
$(document).on('click', '#add-games-confirm', addGames);
$(document).on('click', '#add-games-cancel', () => popups.close('add-games-popup-overlay'));
$(document).on('click', '#add-games-popup-overlay', (e) => {
  if (e.target.id === 'add-games-popup-overlay') popups.close('add-games-popup-overlay');
});
$(document).on('input', '#add-games-search', (e) => searchAddGames($(e.target).val()));
$(document).on('click', '#add-games-dsearch', () => {
  $('#add-games-search').val('');
  searchAddGames('');
});

$(document).on('click', '#name-popup-confirm', confirmListName);
$(document).on('click', '#name-popup-cancel', () => {
  popups.close('name-popup-overlay');
  loadLists();
});
$(document).on('keypress', '#list-name-input', (e) => {
  if (e.keyCode === 13) confirmListName();
});
$(document).on('input', '#list-name-input', () => $('#name-popup-error').hide());

$(document).on('click', '#confirm-popup-yes', () => {
  const onConfirm = $('#confirm-popup-overlay').data('onConfirm');
  popups.close('confirm-popup-overlay');
  onConfirm?.();
});
$(document).on('click', '#confirm-popup-no', () => popups.close('confirm-popup-overlay'));

// Auto-login
if (userId && username) {
  toggle(['#header>.logout', '#header>.username-display', '#lists'],
         ['#header>input', '#header>button.login', '#header>button.create']);
  $('#header>.username-display').text(username);
  loadLists();
}

});