document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
  } else {
    document.getElementById('checkDomainButton').addEventListener('click', checkDomain);
    loadUserUrls(token);
  }
});

function cleanDomain(url) {
  return url.replace(/\s+/g, '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

async function checkDomain() {
  const inputDomain = document.getElementById('domainInput').value;
  if (!inputDomain) {
    alert('No URL provided.');
    return;
  }

  const cleanedDomain = cleanDomain(inputDomain);
  const token = localStorage.getItem('token');
  const response = await fetch('/check-domain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({ domain: cleanedDomain })
  });

  if (response.status === 401) {
    window.location.href = '/login.html';
  }

  const result = await response.json();

  if (response.ok) {
    // Jika respons dari server sukses, tambahkan ke tabel
    const table = document.getElementById('domainTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    const cell4 = newRow.insertCell(3);

    cell1.innerText = cleanedDomain;
    cell2.innerText = result.status;
    cell2.style.color = result.status === 'Blocked' ? 'red' : 'green';
    cell3.innerText = new Date().toLocaleString();
    cell4.innerHTML = `<button onclick="deleteDomain(this, '${cleanedDomain}')">Delete</button>`;
  } else {
    // Tampilkan pesan error jika ada masalah
    alert('Error checking domain: ' + result.message);
  }
}

async function deleteDomain(button, domain) {
  const token = localStorage.getItem('token');
  const response = await fetch('/delete-domain', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({ domain })
  });

  if (response.ok) {
    const row = button.parentElement.parentElement;
    row.parentElement.removeChild(row);
  } else {
    alert('Error deleting domain');
  }
}

async function loadUserUrls(token) {
  const response = await fetch('/user-urls', {
    headers: { 'Authorization': token }
  });

  if (response.status === 401) {
    window.location.href = '/login.html';
  }

  const data = await response.json();
  const table = document.getElementById('domainTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';
  data.forEach(item => {
    const newRow = table.insertRow();
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    const cell4 = newRow.insertCell(3);

    cell1.innerText = item.domain;
    cell2.innerText = item.status;
    cell2.style.color = item.status === 'Blocked' ? 'red' : 'green';
    cell3.innerText = item.lastChecked;
    cell4.innerHTML = `<button onclick="deleteDomain(this, '${item.domain}')">Delete</button>`;
  });
}
document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const username = document.getElementById('loginName').value;
  const password = document.getElementById('loginPassword').value;

  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('token', data.token);
    window.location.href = '/';
  } else {
    alert('Invalid username or password');
  }
});
document.getElementById('registerForm').addEventListener('submit', async function(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  if (response.ok) {
    window.location.href = '/login';
  } else {
    document.getElementById('registerError').textContent = 'Error registering user';
    document.getElementById('registerError').style.display = 'block';
  }
});