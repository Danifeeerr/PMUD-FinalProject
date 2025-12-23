/*jshint esversion: 6 */
$(function() {
  let url = Cookie.get("url") ? JSON.parse(Cookie.get("url")) : "";
  let username = Cookie.get("username") ? JSON.parse(Cookie.get("username")) : "";
  let userId;   // Id of the current user
  let chats;    // List of chats of the current user
  let chatId;   // Id of the current chat
  let messages; // List of messages of the current chat
  let users;    // List of users
  let new_chat = false; // If we are creating a new chat or using existing ones
  let chat_multiple;    // If the chat has multiples users (more than 2)

function date_ddmmyy(date) {
  // Converts a yyyy.mm.dd to dd.mm.yy date format
  return date.slice(8,10) + '.' + date.slice(5,7) + '.' + date.slice(2,4);
}

// VIEWs

const errorView = function(error) {
  $('#header>.message').html("Connection error: " + error);
  setTimeout(() => { // Removes error message after 5 seconds
    $('#header>.message').html("");
  }, 5000);
};

const loginView = function() {
  $('#header>.message').html("");
  $("#header>input.url").prop("readonly", true);
  $("#header>input.username").prop("readonly", true);
  $('#header>input.password').hide();
  $('#header>.login').hide();
  $('#header>.create').hide();
  $('#header>.logout').show();
  $('#chats').show();
  $('#chats>.search').val("");
};

const logoutView = function() {
  $("#header>input.url").val(url).prop("readonly", false);
  $("#header>input.username").val(username).prop("readonly", false);
  $('#header>input.password').val("").show();
  $('#header>.login').show();
  $('#header>.create').show();
  $('#header>.logout').hide();
  $('#chats').hide();
  $('#messages').hide();
};

const chatListView = function(chats) {
  let today = new Date().toISOString().slice(0,10);
  let dt;
  let view = '';
  for (let c of chats) {
    if (c.datetime.slice(0, 10) === today)
      dt = c.datetime.slice(11, 16);
    else
      dt = date_ddmmyy(c.datetime);
    view += `
    <p chatid="${c.id}">
      <span class="chat" chatid="${c.id}">${c.title}</span>
      <img class="delete" chatid="${c.id}" title="Delete"src="public/icon_delete.png"/>
      <span class="datetime">${dt}</span>
    </p>\n`;
  }
  return view;
};

const userListView = function(users) {
  let view = '';
  for (let u of users) {
    view += `
    <p userid="${u.id}">
      <span class="user" userid="${u.id}">${u.name}</span>
    </p>\n`;
  }
  return view;
};

const messageListView = function(messages) { 
  let last_date;
  let view = '';
  for (let m of messages) {
    let date = date_ddmmyy(m.datetime);
    if (date !== last_date) {
       view += `<p class="date"><span>${date}</span></p>\n`;
       last_date= date;
    }
    if (m.userId == userId)
      view += `<p class="own_message" messageid="${m.id}"><span>${m.text}</span><span class="time">${m.datetime.slice(11, 16)}</span></p>\n`;
    else {
      if (chat_multiple)
        view += `<p class="user_message"><span class="time">${m.user.name}:</span></p>\n`;
      view += `<p class="message" messageid="${m.id}"><span>${m.text}</span><span class="time">${m.datetime.slice(11, 16)}</span></p>\n`;
    }
  }
  return view;
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
  url          = $('#header>input.url').val().replace(/\/$/, ''); // Remove slash / at end of URL
  username     = $('#header>input.username').val();
  let password = $('#header>input.password').val();
  if (url === "" || username === "" || password === "") {
    $('#header>.message').html("Missing URL, username or password");
    return;
  }
  Cookie.set("url", JSON.stringify(url), 7);
  Cookie.set("username", JSON.stringify(username), 7);

  try {
    const us = await fetchJSON(
      url + '/users?' + new URLSearchParams({ name: username })
    );
    if (us.length === 0) { // User name not found
      if (create) {
        const u = await fetchJSON(url + '/users', {
          method: 'POST',
          body: JSON.stringify({
            name: username,
            password: password
          })
        });
        userId = u.id;
        loginView();
        chatsController();
      } else
        $('#header>.message').html("Wrong username or password");
    }
    else { // User name found
      if (create)
        $('#header>.message').html("User name alredy exists");
      else if (us[0].password !== password)
        $('#header>.message').html("Wrong username or password");
      else {
        userId = us[0].id;
        loginView();
        chatsController();
      }
    }
  } catch (error) {
    $('#header>.message').html("Connection error: " + error.message);
  }
};

const logoutController = function(create) {
  userId = undefined;
  chats = [];
  chat = undefined;
  logoutView();
};

const chatsController = async function() {
  try {
    const ucs = await fetchJSON(
      url + '/users_chats?userId='+userId
    );
    const promises = ucs.map(uc =>
      fetchJSON(
        url + '/users_chats?_embed=user&_embed=chat&chatId='+uc.chatId
      )
    );

    const expanded = await Promise.all(promises);

    chats = [];
    for (let uc of expanded) {
      let title = "";
      for (let u of uc) {
        if (u.userId != userId)
          title += title === "" ? u.user.name : " + " + u.user.name;
      }
      if (title === "") title = username;
      chats.push({
        id: uc[0].chat.id,
        title,
        datetime: uc[0].chat.datetime,
        multiple: uc.length > 2
      });
    }

    chats.sort((c1, c2) => c1.datetime <= c2.datetime);

    $('#chats>.content').html(chatListView(chats));
    $('#chats>.new_chat').show();
    $('#chats>.add_chat').hide();
    $('#chats>.cancel_chat').hide();
    $('#chats>.search').val("");

  } catch (error) {
    errorView(error.message);
  }
};

const chatsDeleteController = async function(chat_id) {
  let c = chats.filter(e => e.id == chat_id);
  if (confirm(`Do you want to delete chat ${c[0].title} and its messages?`)) {
    try {
      await fetchJSON(url + '/chats/' + chat_id, { method: 'DELETE' });

      chats = chats.filter(e => e.id != chat_id);
      $('#chats>.content').html(chatListView(chats));

      if (chatId == chat_id) {
        chatId = undefined;
        $('#messages').hide();
      }
    } catch (error) {
      errorView(error.message);
    }
  }
};

const chatsNewController = async function() {
  try {
    users = await fetchJSON(url + '/users');
    users.sort((u1, u2) => u1.name <= u2.name);

    $('#chats>.content').html(userListView(users));
    $('#chats>.new_chat').hide();
    $('#chats>.add_chat').show();
    $('#chats>.cancel_chat').show();
    $('#chats>.search').val("");
    $('#messages').hide();

  } catch (error) {
    errorView(error.message);
  }
};

const chatsAddController = async function() {
  let us = [];
  $('.user.active').each((i, e) => us.push($(e).attr('userid')));

  if (us.length === 0) {
    chatsController();
    return;
  }

  if (!us.includes(userId)) us.push(userId);

  try {
    const c = await fetchJSON(url + '/chats', {
      method: 'POST',
      body: JSON.stringify({ datetime: new Date().toISOString() })
    });

    const promises = us.map(u =>
      fetchJSON(url + '/users_chats', {
        method: 'POST',
        body: JSON.stringify({ chatId: c.id, userId: String(u) })
      })
    );

    await Promise.all(promises);
    chatsController();

  } catch (error) {
    errorView(error.message);
  }
};

const chatsSearchController = function(search = "") {
  if (new_chat) {
    let us = users.filter(e => e.name.includes(search));
    $('#chats>.content').html(userListView(us));
  } else {
    let cs = chats.filter(e => e.title.includes(search));
    $('#chats>.content').html(chatListView(cs));
    $(`p[chatid="${chatId}"]`).addClass("active");
  }
};

const messagesController = function(chat_id) {
  $(`p[chatid="${chatId}"]`).removeClass("active");
  chatId = chat_id;
  chat_multiple = chats.filter(e => e.id == chat_id)[0].multiple;
  $(`p[chatid="${chatId}"]`).addClass("active");
  $('#messages').show();
  $('#messages>.search').val("");
  $('#messages>.new_message').val("");
  messagesListController();
};

const messagesListController = async function() {
  try {
    messages = await fetchJSON(
      url + '/messages?' +
      new URLSearchParams({
        _expand: 'user',
        _sort: 'datetime',
        chatId
      })
    );

    let search = $('#messages>.search').val();
    let filtered = messages.filter(e => e.text.includes(search));

    $('#messages>.content').html(messageListView(filtered));
    $('#messages>.content').animate({ scrollTop: 20000000 }, "slow");

  } catch (error) {
    errorView(error.message);
  }
};


const messageSendController = async function() {
  try {
    const m = await fetchJSON(url + '/messages', {
      method: 'POST',
      body: JSON.stringify({
        chatId,
        userId,
        text: $('#messages>.new_message').val(),
        datetime: new Date().toISOString()
      })
    });

    messages.push(m);
    $('#messages>.content').html(messageListView(messages));
    $('#messages>.content').animate({ scrollTop: 20000000 }, "slow");
    $('#messages>.new_message').val("");

    let i = chats.findIndex(e => e.id == chatId);
    chats.unshift({ id: chatId, title: chats[i].title, datetime: m.datetime });
    chats.splice(i + 1, 1);

    $('#chats>.content').html(chatListView(chats));
    $(`p[chatid="${chatId}"]`).addClass("active");

    await fetchJSON(url + '/chats/' + chatId, {
      method: 'PUT',
      body: JSON.stringify({ datetime: m.datetime })
    });

  } catch (error) {
    errorView(error.message);
  }
};

// ROUTER

const eventsController = function() {
  $(document).on('keypress', '#header>input.password', (e) => {if (e.keyCode === 13) loginController(false);});
  $(document).on('click', '#header>.login', ()=> loginController(false));
  $(document).on('click', '#header>.create',()=> loginController(true));
  $(document).on('click', '#header>.logout',()=> logoutController());
  $(document).on('click', '.delete',            (e)=> {chatsDeleteController($(e.currentTarget).attr("chatid"));});
  $(document).on('click', '#chats>.new_chat',   () => {new_chat = true;  chatsNewController();});
  $(document).on('click', '#chats>.add_chat',   () => {new_chat = false; chatsAddController();});
  $(document).on('click', '#chats>.cancel_chat',() => {new_chat = false; chatsController();});
  $(document).on('input', '#chats>.search',     () => {chatsSearchController($('#chats>.search').val());});
  $(document).on('click', '#chats>.dsearch',    () => {chatsSearchController(""); $('#chats>.search').val("");});
  $(document).on('click','.chat',               (e)=> {messagesController($(e.currentTarget).attr("chatid"));});
  $(document).on('click','.user',               (e)=> {$(e.currentTarget).toggleClass("active");});
  $(document).on('input', '#messages>.search',  () => {messagesListController();});
  $(document).on('click', '#messages>.dsearch', () => {$('#messages>.search').val(""); messagesListController();});
  $(document).on('keypress', '#messages>.new_message', (e) => {if (e.keyCode === 13) messageSendController();});
};

eventsController();
logoutController();
setInterval(() => { // Looks every 5 seconds for new messages if a chat is selected
  if (chatId !== undefined)
    messagesListController();
}, 5000);
});
