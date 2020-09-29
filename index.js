const express = require('express');
const app = express()
const http = require('http');
const Bandwidth = require("node-bandwidth");
const bodyParser = require('body-parser')
const WebSocket = require('ws');
const fs = require("fs");

const word_list = fs.readFileSync("./length6.txt","utf-8").split("\n").map((a)=>a.substring(0,a.length - 1));

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

app.use(bodyParser.urlencoded({
  extended: false
}))
// parse application/json
app.use(bodyParser.json());

const number = "+17325897599";

async function sendMessage(msg, tar_number) {
  return new Promise((res, rej) => {
    client.Message.send({
      from: number,
      to: tar_number,
      text: msg
    }).then((mes) => {
      res(mes);
    }).catch((err) => {
      rej(err);
    })
  });
}

const client = new Bandwidth({
  userId: "u-hsq7fm77gl5omujrhyynlwa",
  apiToken: "t-ofnfvrbsps6jjazsh5pbtzy",
  apiSecret: "w7iyadowt7togb3y4ex4zxfz55dqek73rfzx43a"
})
/*
{
  players:[nums]
  currentWord:str 
  mutation: 
} 
*/
let current_games = [];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
};

app.get("", (req, res) => {
  fs.readFile('./new.html', 'utf8', function (err, text) {
    res.send(text);
  });
})

app.get('/new', (req, res) => {
  let game_id = getRandomInt(0,500);

  let game_obj = {
    players: [],
    response_log:[],
    responses: 0,
    playerCount: 0,
    currentWord: "test",
    mutation: ["a","a"],
    started: false,
    id: game_id + "",
    secret: getRandomInt(0, 99999999999)
  }
  current_games.push(game_obj);
  res.send(JSON.stringify({
    secret: game_obj.secret,
    id: game_id,
    ws_port: game_obj.ws_port
  }));
});

function getGame(id) {
  for (let a = 0; a < current_games.length; a++) {
    if (current_games[a].id == id)
      return current_games[a];

  }
  return null;
}

function validPlayer(id) {
  for (let a = 0; a < current_games.length; a++) {
    for (let b = 0; b < current_games[a].players.length; b++) {
      if (current_games[a].players[b] && current_games[a].players[b].id === id)
        return {
          gameInstance: current_games[a],
          player: current_games[a].players[b]
        };
    }
  }
  return false;
}

app.get("/nextRound",function(req,res){
  let {gameid,secret, rounds} = req.query;
  let game = getGame(gameid);
  if(parseInt(secret) === game.secret){
   for(let a = game.players.length - 1; a >= 0;a--){
    if(!game.players[a].complete && rounds > 0){
      sendMessage("You lose :|", game.players[a].id);
      game.players.splice(a);
    } 
   }
   game.responses = 0;
   game.response_log = [];
   game.currentWord = word_list[getRandomInt(0,word_list.length)];

   let swap_char = game.currentWord.charAt(getRandomInt(0,game.currentWord.length));
   let swap_char_2 = String.fromCharCode(getRandomInt(97,122));
   game.mutation = [swap_char,swap_char_2];

   game.players.forEach((x)=>{
     x.complete = false;
   })  
  }
  res.send("test");
});

app.get("/gameState",function(req,res){
  let {gameid,secret} = req.query;
  let game = getGame(gameid);
  let gameState = {
    playerCount:game.playerCount,
    players:game.players,
    responses:game.responses,
    started:game.started,
    currentWord:game.currentWord,
    mutation: game.mutation,
    response_log:game.response_log
  }
  res.send(JSON.stringify(gameState))
})

app.get("/gameStart",function(req,res){
  let {gameid,secret} = req.query;
  let game = getGame(gameid);
  if(parseInt(secret) === game.secret){
    game.started = true;
    res.send("true")
  }
  else
    res.send("false");
})

app.get("/gamelog",function(req,res){
  let gameid = req.query.id;
  let index = req.query.index;
  let game = getGame(gameid);
  let responses = game.response_log;
  res.send(JSON.stringify(responses.slice(index)));
})

app.post('/sms', async function (req, res, next) {
  let {
    text,
    from
  } = req.body;
  let game = getGame(text);
  let {
    player,
    gameInstance
  } = validPlayer(from);
  if (!player && game && !game.started) {
    if (game.players.indexOf(from) === -1) {
      game.players.push({
        complete: false,
        id: from,
        name: undefined
      });
      game.playerCount++;
      let res = await sendMessage("Send a username", from);
    }
  } else {
    if (player && player.name === undefined) {
      player.name = text;
      let res = await sendMessage("Name registered! Wait for the game to start.", from);
    } else if (player && player.name !== undefined && gameInstance.started == true) {
      //game response
      console.log(gameInstance.currentWord);
      let mutations = gameInstance.mutation;
      console.log(mutations)
      console.log(gameInstance.currentWord.replaceAll(mutations[0],mutations[1]));
      console.log(text === gameInstance.currentWord.replaceAll(mutations[0],mutations[1]));
      if (text === gameInstance.currentWord.replaceAll(mutations[0],mutations[1]) && player.complete == false) {
        player.complete = true; 
        gameInstance.responses++;
        let res = await sendMessage("Correct Response!", from);
        gameInstance.response_log.push({text:text, player:player})
      } else {
        let res = await sendMessage("Incorrect Response", from);
      }
    }
  }
  res.writeHead(200, {
    'Content-Type': 'text/xml'
  })
  res.end("placeholder");
});

http.createServer(app).listen(1337, () => {
  console.log('Express server listening on port 1337');
});