// UniFind: a simple browser-only student prototype (no server or database needed).
const STORAGE_KEY = 'unifind_reports_v1';
const itemsEl = document.getElementById('items');
const emptyEl = document.getElementById('empty');
const countEl = document.getElementById('count');
const searchEl = document.getElementById('search');
const filterEl = document.getElementById('filter');
const formEl = document.getElementById('itemForm');
const dateEl = document.getElementById('date');
const messageEl = document.getElementById('message');

function readReports() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error('Could not read saved reports:', error);
    return [];
  }
}

let reports = readReports();
const today = new Date();
const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateEl.value = localDate;
dateEl.max = localDate;

function saveReports() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (error) {
    console.error('Could not save reports:', error);
    alert('Unable to save. Check your browser storage settings.');
    return false;
  }
}

function addText(parent, tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text; // textContent prevents user HTML from being executed.
  if (className) node.className = className;
  parent.appendChild(node);
  return node;
}

function renderReports() {
  const query = searchEl.value.trim().toLowerCase();
  const type = filterEl.value;
  const visible = reports.filter(item =>
    (type === 'all' || item.type === type) &&
    [item.name, item.location, item.description].some(value => value.toLowerCase().includes(query))
  );
  itemsEl.replaceChildren();
  countEl.textContent = `${visible.length} report${visible.length === 1 ? '' : 's'}`;
  emptyEl.hidden = visible.length !== 0;

  visible.forEach(item => {
    const card = document.createElement('article');
    card.className = 'item';
    addText(card, 'span', item.type === 'lost' ? 'LOST' : 'FOUND', `badge ${item.type}`);
    addText(card, 'h3', item.name);
    addText(card, 'p', `📍 ${item.location}`);
    addText(card, 'p', `📅 ${item.date}`, 'muted');
    addText(card, 'p', item.description);
    const deleteButton = addText(card, 'button', 'Delete report', 'delete');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => {
      if (!confirm('Delete this report from this browser?')) return;
      const updated = reports.filter(report => report.id !== item.id);
      const previous = reports;
      reports = updated;
      if (!saveReports()) reports = previous;
      renderReports();
    });
    itemsEl.appendChild(card);
  });
}

formEl.addEventListener('submit', event => {
  event.preventDefault();
  if (!formEl.reportValidity()) return;
  const type = document.getElementById('type').value;
  const name = document.getElementById('name').value.trim();
  const location = document.getElementById('location').value.trim();
  const date = dateEl.value;
  const description = document.getElementById('description').value.trim();
  if (!name || !location || !description || !['lost', 'found'].includes(type) || !date || date > localDate) {
    messageEl.textContent = 'Please check the report details.';
    return;
  }
  const newReport = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, type, name, location, date, description };
  reports.unshift(newReport);
  if (!saveReports()) {
    reports.shift();
    return;
  }
  formEl.reset();
  dateEl.value = localDate;
  searchEl.value = '';
  filterEl.value = 'all';
  messageEl.textContent = 'Report saved!';
  renderReports();
  document.getElementById('browse-title').scrollIntoView({ behavior: 'smooth' });
});
searchEl.addEventListener('input', renderReports);
filterEl.addEventListener('change', renderReports);
renderReports();
