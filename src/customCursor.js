const point0 = document.querySelector('.point-0')
const point1 = document.querySelector('.point-1')
const point2 = document.querySelector('.point-2')
const text = document.getElementById('text')
const text1 = document.getElementById('text1')
const cursor = document.getElementById('cursor')

const mouseMove = (e) => {
  const cursorWidth = cursor.offsetWidth * 0.5
  const cursorHeight = cursor.offsetHeight * 0.5
  const cursorX = e.clientX - cursorWidth
  const cursorY = e.clientY - cursorHeight
  cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`
}

const hoverCursor = () => {
  cursor.classList.add('cursorHover')
}

const unhoverCursor = () => {
  cursor.classList.remove('cursorHover')
}

window.addEventListener('mousemove', mouseMove)

document.querySelectorAll('a').forEach((item) => {
  item.addEventListener('mouseover', hoverCursor)
  item.addEventListener('mouseleave', unhoverCursor)
})

playButton.addEventListener('mouseover', hoverCursor)
playButton.addEventListener('mouseleave', unhoverCursor)

pauseButton.addEventListener('mouseover', hoverCursor)
pauseButton.addEventListener('mouseleave', unhoverCursor)

point0.addEventListener('mouseover', hoverCursor)
point0.addEventListener('mouseleave', unhoverCursor)

point1.addEventListener('mouseover', hoverCursor)
point1.addEventListener('mouseleave', unhoverCursor)

point2.addEventListener('mouseover', hoverCursor)
point2.addEventListener('mouseleave', unhoverCursor)
