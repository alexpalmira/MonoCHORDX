let isEditing = false;
let currentSongId = null;
let currentSong = null;
let currentSetlistId = null;

const modalSong = document.getElementById('modal-song');
const btnAddManual = document.getElementById('btn-add-manual');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnSaveManual = document.getElementById('btn-save-manual');
const btnEditCurrent = document.getElementById('btn-edit-current');
const inputArtist = document.getElementById('input-artist');
const inputTitle = document.getElementById('input-title');
const inputKey = document.getElementById('input-key');
const inputContent = document.getElementById('input-content');

const modalSetlist = document.getElementById('modal-setlist');
const btnAddSetlist = document.getElementById('btn-add-setlist');
const btnCloseSetlist = document.getElementById('btn-close-setlist');
const btnSaveSetlist = document.getElementById('btn-save-setlist');
const inputSetlistName = document.getElementById('input-setlist-name');

const searchInput = document.getElementById('search-input');
const songList = document.getElementById('song-list');
const setlistContainer = document.getElementById('setlist-container');
const btnShowAllSongs = document.getElementById('btn-show-all-songs');
const songHeader = document.getElementById('song-header');
const viewTitle = document.getElementById('view-title');
const viewArtist = document.getElementById('view-artist');
const songContent = document.getElementById('song-content');
const currentKeyDisplay = document.getElementById('current-key');
const btnUp = document.getElementById('transpose-up');
const btnDown = document.getElementById('transpose-down');
const btnAddToList = document.getElementById('btn-add-to-list');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnBackup = document.getElementById('btn-backup');
const btnRestore = document.getElementById('btn-restore');

const fsView = document.getElementById('fullscreen-view');
const fsContent = document.getElementById('fs-song-content');
const fsKeyDisplay = document.getElementById('fs-current-key');
const fsBtnClose = document.getElementById('btn-close-fullscreen');
const fsBtnUp = document.getElementById('fs-transpose-up');
const fsBtnDown = document.getElementById('fs-transpose-down');

let currentSongContent = '';
let currentTranspose = 0;

window.onload = async () => {
    try {
        await dbBrowser.init();
        loadSetlists();
        loadAllSongs();
    } catch (e) { console.error(e); }
};

async function loadAllSongs() {
    currentSetlistId = null;
    searchInput.disabled = false;
    searchInput.value = '';
    const songs = await dbBrowser.getAllSongs();
    renderSongList(songs);
}

if (btnShowAllSongs) btnShowAllSongs.onclick = loadAllSongs;

async function loadSetlists() {
    const lists = await dbBrowser.getAllSetlists();
    renderSetlists(lists);
}

function renderSetlists(lists) {
    if (!setlistContainer) return;
    setlistContainer.innerHTML = '';
    if (lists.length === 0) {
        setlistContainer.innerHTML = '<p class="text-slate-600 text-xs italic text-center py-2">No hay listas creadas</p>';
        return;
    }
    lists.forEach(list => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-2 hover:bg-slate-700 rounded-lg cursor-pointer transition-all group';
        div.innerHTML = '<span class="text-sm text-slate-300 group-hover:text-white truncate">' + list.name + '</span><button class="text-slate-500 hover:text-red-500 text-xs font-bold px-1 opacity-0 group-hover:opacity-100 transition-opacity" data-id="' + list.id + '">✕</button>';
        div.querySelector('span').onclick = async () => {
            currentSetlistId = list.id;
            const songs = await dbBrowser.getSongsInSetlist(list.id);
            renderSongList(songs, true);
            searchInput.value = 'Lista: ' + list.name;
            searchInput.disabled = true;
        };
        div.querySelector('button').onclick = async (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar la lista "' + list.name + '"?')) {
                await dbBrowser.deleteSetlist(list.id);
                loadSetlists();
            }
        };
        setlistContainer.appendChild(div);
    });
}

if (btnAddSetlist) btnAddSetlist.onclick = () => modalSetlist.classList.remove('hidden');
if (btnCloseSetlist) btnCloseSetlist.onclick = () => modalSetlist.classList.add('hidden');
if (btnSaveSetlist) btnSaveSetlist.onclick = async () => {
    const name = inputSetlistName.value.trim();
    if (!name) return alert("El nombre es obligatorio");
    await dbBrowser.createSetlist(name);
    inputSetlistName.value = '';
    modalSetlist.classList.add('hidden');
    loadSetlists();
};
if (btnAddToList) btnAddToList.onclick = async () => {
    if (!currentSong) return alert("Selecciona una canción primero");
    if (!currentSetlistId) return alert("Selecciona un Setlist primero");
    await dbBrowser.addSongToSetlist(currentSetlistId, currentSong.id);
    alert("Añadida a la lista");
};

if (searchInput) {
    searchInput.onclick = () => { if (currentSetlistId !== null) { currentSetlistId = null; searchInput.disabled = false; searchInput.value = ''; } };
    searchInput.onfocus = () => { if (currentSetlistId !== null) { currentSetlistId = null; searchInput.disabled = false; searchInput.value = ''; } };
    searchInput.oninput = async (e) => {
        const queryVal = e.target.value;
        currentSetlistId = null;
        if (queryVal.length > 0) {
            const songs = await dbBrowser.searchSongs(queryVal);
            renderSongList(songs);
        } else {
            songList.innerHTML = '<p class="text-slate-500 text-center mt-10 italic">Busca una canción para empezar</p>';
        }
    };
}

function renderSongList(songs, isSetlist = false) {
    if (!songList) return;
    songList.innerHTML = '';
    if (songs.length === 0) {
        songList.innerHTML = '<p class="text-slate-500 text-center mt-10">No se encontraron canciones</p>';
        return;
    }
    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors group flex justify-between items-center';
        div.innerHTML = '<div class="flex-1"><div class="font-bold group-hover:text-orange-400 transition-colors">' + song.title + '</div><div class="text-sm text-slate-400">' + song.artist + '</div></div>';
        div.onclick = () => loadSong(song);
        if (!isSetlist) {
            const delBtn = document.createElement('button');
            delBtn.className = 'text-slate-500 hover:text-red-500 px-2 font-bold transition-colors';
            delBtn.innerText = 'X';
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('¿Eliminar ' + song.title + '?')) {
                    await dbBrowser.deleteSong(song.id);
                    loadAllSongs();
                }
            };
            div.appendChild(delBtn);
        }
        songList.appendChild(div);
    });
}

function loadSong(song) {
    currentSetlistId = null;
    searchInput.disabled = false;
    searchInput.value = '';
    currentSong = song;
    currentTranspose = 0;
    currentSongContent = song.content;
    if (songHeader) songHeader.classList.remove('hidden');
    if (viewTitle) viewTitle.innerText = song.title;
    if (viewArtist) viewArtist.innerText = song.artist;
    const displayKey = song.key || song.original_key || 'No definida';
    if (currentKeyDisplay) currentKeyDisplay.innerText = 'Tono: ' + displayKey;
    renderSong();
}

if (btnFullscreen) btnFullscreen.onclick = () => { if (currentSong) { fsView.classList.remove('hidden'); document.body.style.overflow = 'hidden'; renderFsSong(); } };
if (fsBtnClose) fsBtnClose.onclick = () => { fsView.classList.add('hidden'); document.body.style.overflow = 'auto'; };
if (fsBtnUp) fsBtnUp.onclick = () => { currentTranspose++; renderFsSong(); };
if (btnDown) btnDown.onclick = () => { currentTranspose--; renderFsSong(); };

function transposeChordCore(chord, amount) {
    if (!chord) return '';
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const normalization = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

    if (chord.includes('/')) {
        const parts = chord.split('/');
        return transposeChordCore(parts[0], amount) + '/' + transposeChordCore(parts[1], amount);
    }

    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;

    let root = match[1];
    const suffix = match[2];
    let normalizedRoot = normalization[root] || root;

    let index = notes.indexOf(normalizedRoot);
    if (index === -1) return chord;

    let newIndex = (index + amount) % 12;
    if (newIndex < 0) newIndex += 12;

    return notes[newIndex] + suffix;
}

function processLine(line, forceLyric = false) {
    if (!line) return '';
    const trimmed = line.trim();
    if (!trimmed) return '<div><br></div>';

    const words = trimmed.split(/\s+/).filter(w => w !== "");

    const isChord = (w) => {
        if (!w) return false;
        // LIMPIEZA PROFUNDA: Eliminamos no solo espacios, sino cualquier carácter
        // invisible o de control al inicio y al final de la palabra.
        const cleanW = w.replace(/^[\s﻿\xA0]+|[\s﻿\xA0]+$/g, '');
        if (cleanW.length === 0) return false;

        const chordRegex = /^([A-G][#b]?)(m|maj|min|dim|aug|sus|add)?([0-9]|11|13)?([#b])?([\/][A-G][#b]?)?$/i;
        if (cleanW.length > 8) return false;
        return chordRegex.test(cleanW);
    };

    const chordCount = words.filter(w => isChord(w)).length;

    // Una línea es de acordes si:
    // 1. Consiste exclusivamente en acordes (esto anula la regla de forceLyric)
    // 2. O si tiene acordes y NO ha sido forzada a ser letra
    const isPureChordLine = words.length > 0 && (chordCount === words.length);
    const isChordLine = isPureChordLine || (!forceLyric && words.length > 0 && chordCount > 0);


    if (isChordLine) {
        const transposed = words.map(w => {
            const cleanW = w.trim();
            // En una línea de acordes, forzamos a que todo se trate como acorde
            // para mantener la coherencia visual y de transposición
            return '<span class="chord">' + transposeChordCore(cleanW, currentTranspose) + '</span>';
        }).join(' ');
        return '<div class="chord-line">' + transposed + '</div>';
    } else {
        // En modo letra, NO buscamos acordes dentro de la línea (Regla 1: No existen ambos al mismo tiempo)
        let result = words.join(' ');
        return '<div class="lyric-line">' + result + '</div>';
    }
}

function renderSong() {
    if (!songContent) return;
    const lines = currentSongContent.split('\n');
    let finalHtml = '';
    let prevLineWasChordLine = false;

    lines.forEach((line, index) => {
        // Si la línea anterior fue de acordes, forzamos la actual a ser de letra
        // pasándole un flag o manejándolo internamente.
        const result = processLine(line, prevLineWasChordLine);
        finalHtml += result;

        // Determinamos si la línea actual es de acordes para la siguiente iteración
        const trimmed = line.trim();
        if (trimmed) {
            const words = trimmed.split(/\s+/).filter(w => w !== "");
            const chordCount = words.filter(w => {
                const cleanW = w.trim();
                if (!cleanW) return false;

                const chordRegex = /^([A-G][#b]?)(m|maj|min|dim|aug|sus|add)?([0-9]|11|13)?([#b])?([\/][A-G][#b]?)?$/i;
                if (cleanW.length > 8 || !chordRegex.test(cleanW)) return false;

                return true;
            }).length;
            prevLineWasChordLine = words.length > 0 && (chordCount > 0);

        } else {
            prevLineWasChordLine = false;
        }
    });
    songContent.innerHTML = finalHtml;
}

function renderFsSong() {
    if (!fsContent) return;
    if (fsKeyDisplay) {
        const baseKey = currentSong.original_key || 'N/A';
        fsKeyDisplay.innerText = 'Tono: ' + baseKey + ' (' + (currentTranspose >= 0 ? '+' : '') + currentTranspose + ')';
    }
    const lines = currentSongContent.split('\n');
    let finalHtml = '';
    let prevLineWasChordLine = false;

    lines.forEach((line, index) => {
        const result = processLine(line, prevLineWasChordLine);
        finalHtml += result;

        const trimmed = line.trim();
        if (trimmed) {
            const words = trimmed.split(/\s+/).filter(w => w !== "");
            const chordCount = words.filter(w => {
                const cleanW = w.trim();
                if (!cleanW) return false;

                const chordRegex = /^([A-G][#b]?)(m|maj|min|dim|aug|sus|add)?([0-9]|11|13)?([#b])?([\/][A-G][#b]?)?$/i;
                if (cleanW.length > 8 || !chordRegex.test(cleanW)) return false;

                return true;
            }).length;
            prevLineWasChordLine = words.length > 0 && (chordCount > 0);

        } else {
            prevLineWasChordLine = false;
        }
    });
    fsContent.innerHTML = finalHtml;
}

if (btnUp) btnUp.onclick = () => { currentTranspose++; renderSong(); };
if (btnDown) btnDown.onclick = () => { currentTranspose--; renderSong(); };
if (btnAddManual) btnAddManual.onclick = () => { modalSong.classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
const closeModal = () => { if (modalSong) modalSong.classList.add('hidden'); document.body.style.overflow = 'auto'; isEditing = false; currentSongId = null; };
if (btnCloseModal) btnCloseModal.onclick = closeModal;
if (btnCancelModal) btnCancelModal.onclick = closeModal;
if (btnSaveManual) {
    btnSaveManual.onclick = async () => {
        const songData = { artist: inputArtist.value.trim(), title: inputTitle.value.trim(), key: inputKey.value.trim(), content: inputContent.value.trim() };
        if (!songData.artist || !songData.title || !songData.content) return alert("Completa los campos");
        if (isEditing) songData.id = currentSongId;
        await dbBrowser.saveSong(songData);
        if (modalSong) modalSong.classList.add('hidden');
        document.body.style.overflow = 'auto';
        loadAllSongs();
    };
}
if (btnEditCurrent) btnEditCurrent.onclick = () => {
    if (!currentSong) return alert("Selecciona una canción");
    isEditing = true; currentSongId = currentSong.id;
    inputArtist.value = currentSong.artist; inputTitle.value = currentSong.title;
    inputKey.value = currentSong.original_key || ''; inputContent.value = currentSong.content;
    modalSong.classList.remove('hidden'); document.body.style.overflow = 'hidden';
};
if (btnBackup) btnBackup.onclick = async () => {
    const data = await dbBrowser.exportDatabase();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'backup.json'; a.click();
};
if (btnRestore) btnRestore.onclick = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (ev) => {
            await dbBrowser.importDatabase(JSON.parse(ev.target.result));
            loadAllSongs(); loadSetlists();
        };
        reader.readAsText(file);
    };
    input.click();
};
