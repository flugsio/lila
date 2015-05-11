var m = require('mithril');
var chessground = require('chessground');
var util = chessground.util;
var canMove = chessground.board.canMove;

var ctrl;

var vm = {
  init: function(c) {
    console.log("init");
    ctrl = c;
    vm.moveString = m.prop('');
    // TODO: mithrialize
    var formatType = 'keypad'; // san, algebraic
    var invertDirection = false;

    // converts NUMPAD keys to direction
    var numberToDirection = {
      '7': [-1,  1], '8': [0,  1], '9': [1,  1],
      '4': [-1,  0],               '6': [1,  0],
      '1': [-1, -1], '2': [0, -1], '3': [1, -1]
    };
    // mostly same as above, but rotated 45 degrees clockwise
    var numberToNight = {
      '7': [-1,  2], '8': [1,  2], '9': [2,  1],
      '4': [-2,  1],               '6': [2, -1],
      '1': [-2, -1], '2': [-1,-2], '3': [1, -2],
    };

    vm.clear = function() {
      vm.moveString('');
    }

    vm.guessMove = function() {
      console.log(ctrl);
      var move;
      var color = ctrl.data.player.color;
      if (formatType === 'keypad') {
        var to = vm.moveString().substr(0, 2);
        var from;
        var where = vm.moveString().substr(2, 1);
        if (color === 'white' ? invertDirection : !invertDirection) {
          // 10 = numberToDirection.keys.max + _.min
          where = (10-parseInt(where)).toString();
        }
        var last = vm.moveString().substr(-1, 1).trim();

        var direction = numberToDirection[where];
        if (direction) {
          from = vm.findPieceInDirection(to, direction, color);
        }
        else if (where === '5') {
          if (last === '5') {
            // searches for nights down each column left to right
            var nights = "41728396".split("").map(function(n) {
              return vm.findPieceInDirection(to, numberToNight[n], color);
            }).filter(function(e) {return e;});
            // each 5 will select the next night, wraps around
            // 555 will select the third night or first if there are only two
            from = nights[(vm.moveString().substr(2).match(/5/g).length-1) % nights.length];
          } else {
            // when last digit is a direction, pick that night directly
            //   for example vm.moveString('3352')
            //   33 means target square c3
            //   5 means find night
            //   2 for nights is direction down/left (45 degrees shift)
            from = vm.findPieceInDirection(to, numberToNight[last], color);
          }
        }
        move = {
          from: from ? util.pos2key(from) : undefined,
          to: util.pos2key(to)
        };
      }
      else if (formatType === 'san') {
        move = {
          from: vm.moveString().substr(0, 2),
          to: vm.moveString().substr(2, 2),
          promotion: vm.moveString().substr(4, 1)
        };
      }
      return move;
    }

    vm.sendMove = function() {
      if (ctrl.data.player.color === ctrl.data.game.player) {
        ctrl.socket.send("move", vm.guessMove(), {
          ackable: true
        });
      } else {
        ctrl.chessground.playPremove(vm.guessMove());
      }
      vm.moveString('');
    }

    vm.preview = function() {
      var move = vm.guessMove();
      if (move.to.length === 1) {
        // TODO: highlight column
        console.log("highlight column " + move.to[0]);
      }
      else if (move.to.length === 2) {
        // TODO: highlight square
        console.log("highlight square " + move.to[0] + move.to[1]);
      }

      if (move.from && move.from.length === 2) {
        // TODO: render piece movement
        console.log("render piece move from  " + move.from[0] + move.from[1]);
      } else {
        // TODO: maybe display available pieces with numbers? or always
      }

      // TODO: promotion
    }

    // '33', [0, -1], 'white' = target c3, searches c2 then c1
    // '33', [0, -1], 'black' = searches c4 through c8 # TODO: check this
    // start and pos is integers in a string or array
    // last argument 'pos' is only for the recursion
    // returns null if it finds opposite color first
    //   or the first piece can't reach the square (pawn/night) # TODO: pinned pieces?
    // TODO: what about orientation, should it invert the search? (and square numbering)
    // TODO: figure out if it makes sense to switch square numbers when changing color
    vm.findPieceInDirection = function(target, direction, color, pos) {
      var pos = [parseInt((pos || target)[0]) + direction[0],
      parseInt((pos || target)[1]) + direction[1]];
      if (pos[0] < 1 || pos[0] > 8 ||
          pos[1] < 1 || pos[2] > 8) {
        // out of bounds
        return null;
      } else {
        var piece = ctrl.chessground.data.pieces[util.pos2key(pos)];
        if (piece) {
          if (piece.color === color) {
            if (canMove(ctrl.chessground.data,
                        util.pos2key(pos),
                        util.pos2key(target))) {
              // found a pice and it can move to target
              return pos;
            } else {
              // this piece can't move to target
              // ASSUMTION: and blocks other pieces behind it so stop search
              // If canMove works, it could probably continue the search
              return null;
            }
          } else {
            // enemy piece, cancel search
            return null;
          }
        } else if (direction[0] !== 0 || direction[1] !== 0) {
          // empty square, continue search if there is a direction
          return vm.findPieceInDirection(target, direction, color, pos);
        }
      }
    }

    vm.handleKey = function(e) {
      var K_NUM_MINUS = 109;
      var K_ENTER = 13;
      var K_SPACE = 32;

      switch (e.keyCode) {
        case K_NUM_MINUS:
          vm.clear();
          break;
        case K_ENTER:
        case K_SPACE:
          vm.sendMove();
          break;
      }
      vm.preview();
    }

  }
}

module.exports = function(ctrl) {
  // TODO: how
  if (!vm.moveString) vm.init(ctrl);
  return m('div', {class: 'keyboard_navigation'},
      m('input', {
        class: 'move', name: 'move',
        value: vm.moveString(),
        oninput: m.withAttr("value", vm.moveString),
        onkeyup: vm.handleKey
      })
  );
}
