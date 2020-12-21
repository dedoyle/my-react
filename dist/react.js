const isEvent = (key) => key.startsWith('on')
const isProperty = (key) => key !== 'children' && !isEvent(key)
const isNew = (prev, next) => (key) => prev[key] !== next[key]
const isGone = (prev, next) => (key) => !(key in next)

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      // 为了方便，给 text 结点补上空 children，
      // 而事实上 react 并不会这么做
      children: [],
    },
  }
}

function createDom(fiber) {
  // TEXT_ELEMENT 需要区别对待
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)

  return dom
}

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  // 目前为止，只实现了添加 DOM 结点
  // 更新和删除该如何呢？
  // 需要能够对比 render 接收的 element
  // 和上个 commit 的 fiber 之间有何区别
  // 所以这里保存 wipRoot，作为当前 root fiber
  currentRoot = wipRoot
  wipRoot = null
}

function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      (key) =>
        isGone(prevProps, nextProps)(key) || isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = ''
    })
  // set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name]
    })
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }

  const domParent = fiber.parent.dom
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  } else if (fiber.effectTag === 'DELETION') {
    domParent.removeChild(fiber.dom)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function render(element, container) {
  // 避免每次 performUnitOfWork 都修改 dom
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    // 指向（相对于即将更新的 fiber 来说）的上一个 fiber
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

/**
 * Step III: Concurrent Mode
 * 虽然 render 已经能正常运转，但是当 element tree 太大时，
 * 有可能会阻塞主线程，导致高优先级的任务未能及时响应，
 * 比如用户输入或保持一个顺滑的动画。
 * 所以，我们将 work 分散成多个小的 units，
 * 每完成一个 unit 都能让浏览器在有需要的时候中断 render
 */
let nextUnitOfWork = null
// Step VI: Reconciliation
let currentRoot = null
// work in progress root
let wipRoot = null
// 保存将要移除的 fiber
let deletions = null

/**
 *
 * @param {object} deadline 可以用来查询还有多少剩余时间
 */
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  // 完成所有工作后，将 fiber 逐个挂载到 dom
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  requestIdleCallback(workLoop)
}

// 类似于 setTimeout，不过浏览器会在主线程空闲的时候才去运行，
// 而不是我们主动去调用
requestIdleCallback(workLoop)

// Didact.render(
//   <div>
//     <h1>
//       <p />
//       <a />
//     </h1>
//     <h2 />
//   </div>,
//   container
// )
/**
 * Step IV: Fibers DFS 深度优先遍历
 * 需要有一个数据结构来管理这些 work unit —— fiber 树
 * 每个元素都是一个 fiber，而每个 fiber 都是一个 work unit
 * 上方的 render 将会首先创建一个 root fiber，然后将其设置为 nextUnitOfWork
 * 然后调用 performUnitOfWork，该函数会对每个 fiber 做以下三件事
 *   1. 将 element 加到 DOM 中
 *   2. 为 element 的 children 分别创建 fiber
 *   3. 确定下一个 work unit
 *
 * Fiber Tree
 * 这个数据结构，目的之一就是为了能够容易的找到下一个 work unit，
 * 所以每个 fiber 都有指针指向第一个 child，下一个 sibling 和 parent
 *
 * performUnitOfWork 是一个深度优先遍历的过程，
 * 当前结点处理完，会优先处理第一个 child，然后逐个处理该 child 的 sibling，
 * 然后再回到当前结点的 sibling，依次类推
 */

/**
 *
 * @param {Fiber} fiber 工作单元
 */
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  const elements = fiber.props.children
  reconcileChildren(fiber, elements)

  // 如果有 child，则返回 child
  if (fiber.child) {
    return fiber.child
  }
  // 否则先查找 sibling
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

/**
 *
 * @param {Fiber} wipFiber 当前任务处理的 fiber
 * @param {*} elements children
 */
function reconcileChildren(wipFiber, elements) {
  let index = 0
  // 第一个 child
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null

    const sameType = oldFiber && element && element.type === oldFiber.type
    if (sameType) {
      // update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      }
    }
    if (element && !sameType) {
      // add this node
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      }
    }

    if (oldFiber && !sameType) {
      // delete the oldFiber's node
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

export default {
  createElement,
  render,
}
