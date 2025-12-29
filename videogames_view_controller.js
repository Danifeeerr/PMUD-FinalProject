/*jshint esversion: 6 */
$(function() {
  let url = "http://localhost:3000";

  // Leer desde localStorage
  let username = localStorage.getItem("username") || "";
  let userId = localStorage.getItem("userId");
  
  // Convertir userId a número
  if (userId) {
    userId = parseInt(userId);
    if (isNaN(userId)) {
      userId = undefined;
    }
  }

  console.log("Username:", username);
  console.log("UserId:", userId);
  console.log("UserId type:", typeof userId);

  let videogames;  // List of all videogames
  let lists;       // List of lists of the current user
  let listId = undefined;      // Id of the current list - INICIALIZAR EXPLÍCITAMENTE
  let listGames;   // List of videogames in the current list
  let new_list = false; // If we are creating a new list or using existing ones

// VIEWs

const errorView = function(error) {
  $('#header>.message').html("Connection error: " + error);
  setTimeout(() => { // Removes error message after 5 seconds
    $('#header>.message').html("");
  }, 5000);
};

const loginView = function() {
  $('#header>.message').html("");
  $("#header>input.username").hide();
  $('#header>input.password').hide();
  $('#header>.login').hide();
  $('#header>.create').hide();
  $('#header>.logout').show();
  $('#header>.username-display').show().text(username);
  $('#lists').show();
  $('#lists>.search').val("");
};

const logoutView = function() {
  $("#header>input.username").val("").show().prop("readonly", false);
  $('#header>input.password').val("").show();
  $('#header>.login').show();
  $('#header>.create').show();
  $('#header>.logout').hide();
  $('#header>.username-display').hide();
  $('#lists').hide();
  closePopup();
};

const listListView = function(lists) {
  let view = '';
  for (let l of lists) {
    view += `
    <div class="list-card" listid="${l.id}">
      <div class="list-card-header">
        <h3 class="list" listid="${l.id}">${l.listname}</h3>
        <img class="delete" listid="${l.id}" title="Delete" src="public/icon_delete.png"/>
      </div>
      <div class="list-card-footer">
        <span>Click to view games</span>
      </div>
    </div>\n`;
  }
  return view;
};

const videogameListView = function(videogames) {
  let view = '';
  for (let v of videogames) {
    view += `
    <div class="videogame-card" videogameid="${v.id}">
      <span class="videogame" videogameid="${v.id}">${v.title}</span>
      <span class="year">${v.release_year}</span>
    </div>\n`;
  }
  return view;
};

const listVideogamesView = function(listGames) { 
  let view = '';
  if (listGames.length === 0) {
    return '<p class="empty-list">No games in this list yet.</p>';
  }
  for (let vl of listGames) {
    view += `
    <div class="popup-game-item" videogamelistid="${vl.id}">
      <div class="game-info">
        <span class="game-title">${vl.videogame.title}</span>
        <span class="game-year">${vl.videogame.release_year}</span>
      </div>
      <img class="remove" videogamelistid="${vl.id}" title="Remove" src="public/icon_delete.png"/>
    </div>\n`;
  }
  return view;
};

// POPUP Functions
const openPopup = function(listName) {
  $('#popup-title').text(listName);
  $('#popup-overlay').show();
  $('body').css('overflow', 'hidden');
};

const closePopup = function() {
  $('#popup-overlay').hide();
  $('body').css('overflow', 'auto');
  listId = undefined;
};

// CONTROLLERs

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return response.json();
}

const loginController = async function(create) {
  username = $('#header>input.username').val();
  let password = $('#header>input.password').val();
  
  if (username === "" || password === "") {
    $('#header>.message').html("Missing username or password");
    return;
  }

  try {
    const us = await fetchJSON(
      url + '/users?' + new URLSearchParams({ username: username })
    );
    
    if (us.length === 0) {
      if (create) {
        const u = await fetchJSON(url + '/users', {
          method: 'POST',
          body: JSON.stringify({
            username: username,
            password: password
          })
        });
        userId = u.id;
        localStorage.setItem("username", username);
        localStorage.setItem("userId", String(userId));
        loginView();
        listsController();
      } else {
        $('#header>.message').html("Wrong username or password");
      }
    } else {
      if (create) {
        $('#header>.message').html("User name already exists");
      } else if (us[0].password !== password) {
        $('#header>.message').html("Wrong username or password");
      } else {
        userId = us[0].id;
        localStorage.setItem("username", username);
        localStorage.setItem("userId", String(userId));
        loginView();
        listsController();
      }
    }
  } catch (error) {
    $('#header>.message').html("Connection error: " + error.message);
  }
};

const logoutController = function() {
  userId = undefined;
  username = "";
  lists = [];
  listId = undefined;
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  logoutView();
};

const listsController = async function() {
  try {
    lists = await fetchJSON(
      url + '/lists?userid=' + userId
    );

    $('#lists>.content').html(listListView(lists));
    $('.new_list').show();
    $('.add_list').hide();
    $('.cancel_list').hide();
    $('.search').val("");
    new_list = false;
    closePopup(); // ASEGURAR QUE EL POPUP ESTÉ CERRADO

  } catch (error) {
    errorView(error.message);
  }
};

const listsDeleteController = async function(list_id) {
  let l = lists.filter(e => e.id == list_id);
  if (confirm(`Do you want to delete list "${l[0].listname}" and its videogames?`)) {
    try {
      await fetchJSON(url + '/lists/' + list_id, { method: 'DELETE' });

      lists = lists.filter(e => e.id != list_id);
      $('#lists>.content').html(listListView(lists));

      if (listId == list_id) {
        closePopup();
      }
    } catch (error) {
      errorView(error.message);
    }
  }
};

const listsNewController = async function() {
  try {
    videogames = await fetchJSON(url + '/videogames');
    videogames.sort((v1, v2) => v1.title.localeCompare(v2.title));

    $('#lists>.content').html(videogameListView(videogames));
    $('.new_list').hide();
    $('.add_list').show();
    $('.cancel_list').show();
    $('.search').val("");
    new_list = true;

  } catch (error) {
    errorView(error.message);
  }
};

const listsAddController = async function() {
  let vgs = [];
  $('.videogame-card.active').each((i, e) => vgs.push($(e).attr('videogameid')));

  if (vgs.length === 0) {
    alert("Please select at least one game");
    return;
  }

  let listname = prompt("Enter list name:");
  if (!listname || listname.trim() === "") {
    listsController();
    return;
  }

  try {
    const l = await fetchJSON(url + '/lists', {
      method: 'POST',
      body: JSON.stringify({ 
        userid: userId,
        listname: listname.trim()
      })
    });

    const promises = vgs.map(v =>
      fetchJSON(url + '/videogames_lists', {
        method: 'POST',
        body: JSON.stringify({ 
          listid: l.id, 
          videogameid: String(v) 
        })
      })
    );

    await Promise.all(promises);
    listsController();

  } catch (error) {
    errorView(error.message);
  }
};

const listsSearchController = function(search = "") {
  if (new_list) {
    let vgs = videogames.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));
    $('#lists>.content').html(videogameListView(vgs));
  } else {
    let ls = lists.filter(e => e.listname.toLowerCase().includes(search.toLowerCase()));
    $('#lists>.content').html(listListView(ls));
  }
};

const videogamesController = async function(list_id) {
  listId = list_id;
  let listName = lists.find(l => l.id == list_id).listname;
  openPopup(listName);
  $('.videogames-search').val("");
  videogamesListController();
};

const videogamesListController = async function() {
  try {
    listGames = await fetchJSON(
      url + '/videogames_lists?' +
      new URLSearchParams({
        _expand: 'videogame',
        listid: listId
      })
    );

    let search = $('.videogames-search').val();
    let filtered = listGames.filter(e => e.videogame.title.toLowerCase().includes(search.toLowerCase()));

    $('.popup-content').html(listVideogamesView(filtered));

  } catch (error) {
    errorView(error.message);
  }
};

const videogameRemoveController = async function(videogamelist_id) {
  if (confirm("Remove this game from the list?")) {
    try {
      await fetchJSON(url + '/videogames_lists/' + videogamelist_id, {
        method: 'DELETE'
      });

      videogamesListController();

    } catch (error) {
      errorView(error.message);
    }
  }
};

// ROUTER

const eventsController = function() {
  $(document).on('keypress', '#header>input.password', (e) => {if (e.keyCode === 13) loginController(false);});
  $(document).on('click', '#header>.login', ()=> loginController(false));
  $(document).on('click', '#header>.create',()=> loginController(true));
  $(document).on('click', '#header>.logout',()=> logoutController());
  
  // Botones de lists
  $(document).on('click', '.new_list',   () => {new_list = true;  listsNewController();});
  $(document).on('click', '.add_list',   () => {new_list = false; listsAddController();});
  $(document).on('click', '.cancel_list',() => {new_list = false; listsController();});
  
  // Delete con stopPropagation para que no abra el popup
  $(document).on('click', '.delete', (e) => {
    e.stopPropagation(); 
    listsDeleteController($(e.currentTarget).attr("listid"));
  });
  
  // Búsqueda
  $(document).on('input', '.search', () => {listsSearchController($('.search').val());});
  $(document).on('click', '.dsearch', () => {listsSearchController(""); $('.search').val("");});
  
  // Click en lista (título o card completo)
  $(document).on('click', '.list', (e) => {
    e.stopPropagation();
    videogamesController($(e.currentTarget).attr("listid"));
  });
  $(document).on('click', '.list-card', (e) => {
    if (!$(e.target).hasClass('delete') && !$(e.target).closest('.delete').length) {
      videogamesController($(e.currentTarget).attr("listid"));
    }
  });
  
  // Selección de videojuegos - SOLO click en la card completa
  $(document).on('click', '.videogame-card', (e) => {
    $(e.currentTarget).toggleClass("active");
  });
  
  // Popup
  $(document).on('input', '.videogames-search', () => {videogamesListController();});
  $(document).on('click', '.videogames-dsearch', () => {$('.videogames-search').val(""); videogamesListController();});
  $(document).on('click', '.remove', (e) => {videogameRemoveController($(e.currentTarget).attr("videogamelistid"));});
  $(document).on('click', '.popup-close', () => {closePopup();});
  $(document).on('click', '#popup-overlay', (e) => {
    if (e.target.id === 'popup-overlay') closePopup();
  });
};

eventsController();

// Auto-login con localStorage
console.log("Checking auto-login - userId:", userId, "username:", username);

if (userId && username) {
  console.log("Auto-login activado");
  loginView();
  listsController();
} else {
  console.log("Mostrando vista de logout");
  logoutView();
}

});