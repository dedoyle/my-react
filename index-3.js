import Didact from './react.js'
/* @jsx Didact.createElement */

function App(props) {
  return <h1>Hi {props.name}</h1>
}

/**
 * 函数组件和直接的 html element 有两个不同之处
 * 1. 函数组件的 fiber 没有 DOM node
 * 2. children 通过执行函数获得，而非直接从 props 获得
 */
const element = <App name="foo" />

const container = document.getElementById('root')
Didact.render(element, container)
