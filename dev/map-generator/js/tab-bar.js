function switchTab(tabName) {
  var btn2d = document.getElementById('tab2d');
  var btn3d = document.getElementById('tab3d');
  var panel2d = document.getElementById('panel2d');
  var panel3d = document.getElementById('panel3d');

  if (tabName === '2D') {
    btn2d.classList.add('active');
    btn3d.classList.remove('active');
    panel2d.classList.add('active');
    panel3d.classList.remove('active');
  } else {
    btn3d.classList.add('active');
    btn2d.classList.remove('active');
    panel3d.classList.add('active');
    panel2d.classList.remove('active');
  }
}