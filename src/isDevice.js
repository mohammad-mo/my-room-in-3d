const cursoIcon = document.querySelector('.cursor-icon')

// Hide the cursor for mobile devices
;(function isDevice() {
  let ua = navigator.userAgent

  if (
    ua.match(/Android/i) ||
    ua.match(/BlackBerry/i) ||
    ua.match(/IEMobile/i) ||
    ua.match(/iPhone|iPad|iPod/i) ||
    (ua.match(/Mac/) &&
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 2) ||
    ua.match(/Opera Mini/i)
  ) {
    cursoIcon.style.opacity = 0
  }
})()
