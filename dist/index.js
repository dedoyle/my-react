import Didact from './react.js';
/* @jsx Didact.createElement */

function Counter() {
  const [state, setState] = Didact.useState(1);
  return Didact.createElement("h1", {
    onClick: () => setState(c => c + 1)
  }, "Count: ", state);
}
/**
 * Hook
 */


const element = Didact.createElement(Counter, null);
const container = document.getElementById('root');
Didact.render(element, container);