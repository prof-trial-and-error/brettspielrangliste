// ── Parse pre-aggregated CSV from Apps Script ──────────────────────
// Expects: "Game,Votes\nCatan,5\nMonopoly,3\n..."
function parseRankingsCsv(text) {
    var lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    var rankings = [];
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var lastComma = line.lastIndexOf(',');
        if (lastComma === -1) continue;
        var game = line.substring(0, lastComma).trim();
        var count = parseInt(line.substring(lastComma + 1).trim(), 10);
        if (game && !isNaN(count)) {
            rankings.push({ game: game, count: count });
        }
    }
    return rankings;
}

// ── Data fetching ───────────────────────────────────────────────────
function fetchRankings() {
    var url = window.SITE_CONFIG.apiUrl;
    if (!url) return Promise.resolve([]);

    return fetch(url)
        .then(function (res) { return res.text(); })
        .then(function (csv) { return parseRankingsCsv(csv); });
}

// ── DOM rendering ───────────────────────────────────────────────────
function renderRankings(rankings) {
    var container = document.getElementById('ranking-list');
    if (!rankings || rankings.length === 0) {
        container.innerHTML = '<p class="no-votes">Noch keine Stimmen! Sei der Erste!</p>';
        return;
    }

    var top10 = rankings.slice(0, 10);
    var html = '<ol class="ranking">';
    top10.forEach(function (item, index) {
        var medal = index === 0 ? ' gold' : index === 1 ? ' silver' : index === 2 ? ' bronze' : '';
        html += '<li class="ranking-item' + medal + '">' +
            '<span class="rank">' + (index + 1) + '</span>' +
            '<span class="game-name">' + escapeHtml(item.game) + '</span>' +
            '<span class="vote-count">' + item.count + ' Stimme' + (item.count !== 1 ? 'n' : '') + '</span>' +
            '</li>';
    });
    html += '</ol>';
    container.innerHTML = html;
}

function populateDropdown(rankings) {
    var select = document.getElementById('selectedGame');
    if (!select) return;

    select.innerHTML = '<option value="">-- Waehle ein Spiel --</option>';
    if (!rankings) return;

    var top5 = rankings.slice(0, 5);
    top5.forEach(function (item) {
        var option = document.createElement('option');
        option.value = item.game;
        option.textContent = item.game;
        select.appendChild(option);
    });
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ── Load and display ────────────────────────────────────────────────
function loadData() {
    fetchRankings()
        .then(function (rankings) {
            renderRankings(rankings);
            populateDropdown(rankings);
        })
        .catch(function () {
            document.getElementById('ranking-list').innerHTML =
                '<p class="error">Fehler beim Laden</p>';
        });
}

// ── Form submission via Google Apps Script ───────────────────────────
function setupForm() {
    var form = document.getElementById('vote-form');
    if (!form) return;

    var selectEl = document.getElementById('selectedGame');
    var newGameEl = document.getElementById('newGame');

    selectEl.addEventListener('change', function () {
        if (this.value) newGameEl.value = '';
    });

    newGameEl.addEventListener('input', function () {
        if (this.value.trim()) selectEl.value = '';
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var messageDiv = document.getElementById('message');

        var name = document.getElementById('name').value.trim();
        var nickname = document.getElementById('nickname').value.trim();
        var favorite = selectEl.value;
        var another = newGameEl.value.trim();

        if (!name || !nickname) {
            messageDiv.textContent = 'Bitte gib deinen Namen und Spitznamen ein!';
            messageDiv.className = 'message error';
            return;
        }
        if (!favorite && !another) {
            messageDiv.textContent = 'Bitte waehle ein Spiel oder gib ein neues ein!';
            messageDiv.className = 'message error';
            return;
        }

        var url = window.SITE_CONFIG.apiUrl;
        if (!url) {
            messageDiv.textContent = 'Abstimmung ist noch nicht konfiguriert.';
            messageDiv.className = 'message error';
            return;
        }

        // POST JSON to Apps Script endpoint
        // Content-Type must be application/x-www-form-urlencoded for Google Apps Script
        // to receive the body through the redirect. mode: no-cors because the
        // 302 redirect to googleusercontent.com doesn't set CORS headers.
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: JSON.stringify({ name: name, nickname: nickname, favorite: favorite, another: another })
        })
        .then(function () {
            messageDiv.textContent = 'Super! Deine Stimme wurde gezaehlt!';
            messageDiv.className = 'message success';
            form.reset();
            setTimeout(loadData, 2000);
        })
        .catch(function () {
            messageDiv.textContent = 'Verbindungsfehler. Bitte versuche es erneut.';
            messageDiv.className = 'message error';
        });
    });
}

// ── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    loadData();
    setupForm();
});
