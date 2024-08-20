document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      document.getElementById('checkDomainsButton').addEventListener('click', checkDomains);
    }
  });

  function cleanDomain(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  }

  async function checkDomains() {
    const inputDomains = document.getElementById('domainList').value;
    if (!inputDomains) {
      alert('No URLs provided.');
      return;
    }

    const domainsArray = inputDomains.split('\n').map(domain => cleanDomain(domain.trim())).filter(Boolean);
    const token = localStorage.getItem('token');
    const response = await fetch('/bulk-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ domains: domainsArray })
    });

    if (response.status === 401) {
      window.location.href = '/login';
    }

    const results = await response.json();
    const table = document.getElementById('bulkDomainTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    results.forEach(result => {
      const newRow = table.insertRow();
      const cell1 = newRow.insertCell(0);
      const cell2 = newRow.insertCell(1);

      cell1.innerText = result.domain;
      cell2.innerText = result.status;
      cell2.style.color = result.status === 'Blocked' ? 'red' : 'green';
    });
  }