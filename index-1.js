// const element = <h1 title="foo">Hello</h1>
// => 转换为 js
// const element = React.createElement('h1', { title: 'foo' }, 'Hello')
// => 转换为 element 对象，type 即为 createElement 的第一个参数 tagName
const element = {
  type: 'h1',
  props: {
    title: 'foo',
    // 这里是一个字符串，但更常见的是数组，包含了多个元素，
    // 而这也是为什么 elements 是一个树
    children: 'Hello',
  },
}
// <=

const contianer = document.getElementById('root')

// render 是 react 更新 DOM 的地方
// ReactDOM.render(element, container)
// => 创建一个 node，类型为 element.type 'h1'
const node = document.createElement(element.type)
// 将 props 传给 node
node['title'] = element.props.title
// 为了避免混淆，这里用 node 指 DOM elements，
// element 指 React elements
// 然后开始为 children 创建结点
// 这里只是一个字符串，所以创建一个 textNode
// 用 textNode 而不是 innerText 是为了统一对待所有元素
const text = document.createTextNode('')
// 给 text 设置 nodeValue 就像 h1 那样，
// 也有个 props {nodeValue: 'Hello'}
text['nodeValue'] = element.props.children
// 将 textNode append 到 h1，h1 append 到 container
node.appendChild(text)
contianer.appendChild(node)
// <=
