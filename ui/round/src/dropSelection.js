var m = require('mithril');
var chessground = require('chessground');
var partial = chessground.util.partial;
var ground = require('./ground');
var xhr = require('./xhr');
var invertKey = chessground.util.invertKey;
var key2pos = chessground.util.key2pos;

var dropping = false;
var TAU = 2 * Math.PI;

function start(ctrl, orig, dest, isPremove) {
  var piece = ctrl.chessground.data.pieces[dest];
  // TODO: check that game mode is crazyhouse
  // cancel if there is no droppable pieces?
  console.log("starting drop");
  console.debug(orig);
  if (!orig && !piece && !isPremove || (
      // this is for testing only, activate for queen
      orig == 'd1' || orig == 'd8')) {
    m.startComputation();
    // TODO: array?
    dropping = [dest];
    m.endComputation();
    return true;
  }
  return false;
}

function finish(ctrl, role) {
  console.log("finishing drop");
  if (dropping) {
    // TODO: to prerender move?  ui/round/src/ground.js
    //ground.drop(ctrl.chessground, dropping[0], role);
    ctrl.sendNewPiece(role, dropping[0], false);
  }
  dropping = false;
}

function cancel(ctrl) {
  console.log("cancel drop");
  // what is this
  if (dropping) xhr.reload(ctrl).then(ctrl.reload);
  dropping = false;
}

function renderDropSelection(ctrl, dest, pieces, color, orientation) {
  var left = (key2pos(orientation === 'white' ? dest : invertKey(dest))[0] -1) * 12.5;
  var top  = (key2pos(orientation === 'white' ? dest : invertKey(dest))[1] -1) * 12.5;
  var radie = 12.5;
  var theta = TAU * 1/4;
  theta = 0;

  return m('div#promotion_choice.drop_selection', {
    onclick: partial(cancel, ctrl)
  }, pieces.map(function(serverRole, i) {
    var rotation = (i + 1) / 5;
    var x = radie * Math.cos(TAU * rotation + theta) + left;
    var y = radie * Math.sin(TAU * rotation + theta) + top;
    return m('square', {
      style: 'bottom: ' + y + '%;left: ' + x + '%',
      onclick: function(e) {
        e.stopPropagation();
        finish(ctrl, serverRole);
      }
    }, m('piece.' + serverRole + '.' + color));
  }));
}

module.exports = {

  start: start,

  view: function(ctrl) {
    if (!dropping) return;
    //var pieces = ['queen', 'knight', 'rook', 'bishop', 'pawn'];
    var pieces = ['rook', 'knight', 'bishop', 'queen', 'pawn'];

    return renderDropSelection(ctrl, dropping[0], pieces,
        ctrl.data.player.color,
        ctrl.chessground.data.orientation);
  }
};
