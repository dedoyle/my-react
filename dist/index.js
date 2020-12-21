import Didact from './react.js';
/* @jsx Didact.createElement */

const element = Didact.createElement("div", {
  id: "foo"
}, Didact.createElement("a", null, "bar"), Didact.createElement("b", null)); // =>
// const element = Didact.createElement(
//   'div',
//   { id: 'foo' },
//   Didact.createElement('a', null, 'bar'),
//   Didact.createElement('b')
// )
// <=

const container = document.getElementById('root');
Didact.render(element, container);