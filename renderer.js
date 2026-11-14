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

const contextMenu = document.getElementById('context-menu');
const ctxAddSetlist = document.getElementById('ctx-add-setlist');
const ctxEdit = document.getElementById('ctx-edit');
const ctxDelete = document.getElementById('ctx-delete');
const ctxRemoveSetlist = document.getElementById('ctx-remove-setlist');
const ctxSetlistsSubmenuTrigger = document.getElementById('ctx-setlists-submenu-trigger');
const ctxSetlistsSubmenu = document.getElementById('ctx-setlists-submenu');

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
        div.innerHTML = '<span class="text-sm text-slate-300 group-hover:text-white truncate">' + list.name + '</span>';

        // CLICK SIMPLE: Filtrar canciones del setlist inmediatamente
        div.onclick = async () => {
            try {
                currentSetlistId = list.id;

                // 1. Limpiar la lista inmediatamente para evitar confusiones visuales
                if (songList) songList.innerHTML = '<p class="text-slate-500 text-center mt-10 italic">Cargando canciones del setlist...</p>';

                // 2. Obtener SOLO las canciones de este setlist
                const songs = await dbBrowser.getSongsInSetlist(list.id);

                // 3. Renderizar exclusivamente esas canciones
                renderSongList(songs, true);

                // 4. Actualizar buscador para indicar el filtro activo
                searchInput.value = 'Filtrando Setlist: ' + list.name;
                searchInput.disabled = true;
            } catch (e) {
                console.error("Error al cargar setlist:", e);
                songList.innerHTML = '<p class="text-red-500 text-center mt-10">Error al cargar las canciones de la lista</p>';
            }
        };

        div.oncontextmenu = (e) => {
            e.preventDefault();
            showContextMenu(e.pageX, e.pageY, {
                id: list.id,
                title: list.name,
                artist: 'Setlist',
                isSetlist: true
            });
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
    if (!currentSetlistId) return alert("Selecciona un Setlist primero");

    const modal = document.getElementById('modal-add-songs-to-setlist');
    const container = document.getElementById('all-songs-selection-container');
    const closeBtn = document.getElementById('btn-close-add-songs');
    const cancelBtn = document.getElementById('btn-cancel-add-songs');
    const confirmBtn = document.getElementById('btn-confirm-add-songs');

    if (modal && container) {
        const allSongs = await dbBrowser.getAllSongs();
        container.innerHTML = '';

        allSongs.forEach(song => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors';
            div.innerHTML = `
                <input type="checkbox" id="chk-${song.id}" class="w-5 h-5 accent-orange-500 cursor-pointer">
                <label for="chk-${song.id}" class="flex-1 cursor-pointer">
                    <div class="font-bold text-white">${song.title}</div>
                    <div class="text-sm text-slate-400">${song.artist}</div>
                </label>
            `;
            // Hacer que click en el div también marque el checkbox
            div.onclick = (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const chk = div.querySelector('input');
                    chk.checked = !chk.checked;
                }
            };
            container.appendChild(div);
        });

        modal.classList.remove('hidden');

        // Eventos de cierre
        const hideModal = () => modal.classList.add('hidden');
        if (closeBtn) closeBtn.onclick = hideModal;
        if (cancelBtn) cancelBtn.onclick = hideModal;

        // Acción de confirmar
        confirmBtn.onclick = async () => {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            const selectedIds = Array.from(checkboxes).map(cb => cb.id.replace('chk-', ''));

            if (selectedIds.length === 0) return alert("Selecciona al menos una canción");

            for (const songId of selectedIds) {
                await dbBrowser.addSongToSetlist(currentSetlistId, songId);
            }

            alert(`Se han añadido ${selectedIds.length} canciones al setlist`);
            hideModal();

            // Actualizar la lista actual si estamos visualizando ese setlist
            const songsInList = await dbBrowser.getSongsInSetlist(currentSetlistId);
            renderSongList(songsInList, true);
        };
    }
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

        // Clic izquierdo: Cargar canción
        div.onclick = () => loadSong(song);

        // Clic derecho: Menú Contextual
        div.oncontextmenu = (e) => {
            e.preventDefault();
            showContextMenu(e.pageX, e.pageY, song);
        };

        songList.appendChild(div);
    });
}

// Lógica del Menú Contextual
async function showContextMenu(x, y, song) {
    currentSong = song;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');

    // Cargar el submenú de setlists dinámicamente
    if (ctxSetlistsSubmenu) {
        const lists = await dbBrowser.getAllSetlists();
        ctxSetlistsSubmenu.innerHTML = '';

        if (lists.length === 0) {
            ctxSetlistsSubmenu.innerHTML = '<div class="px-4 py-2 text-slate-500 italic">No hay listas</div>';
        } else {
            lists.forEach(list => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-2';
                btn.innerHTML = '<span class="truncate">' + list.name + '</span>';
                btn.onclick = async () => {
                    await dbBrowser.addSongToSetlist(list.id, song.id);
                    alert('Añadida a: ' + list.name);
                    contextMenu.classList.add('hidden');
                };
                ctxSetlistsSubmenu.appendChild(btn);
            });
        }
    }
}

if (ctxAddSetlist) ctxAddSetlist.onclick = async () => {
    if (!currentSong) return;
    const modal = document.getElementById('modal-select-setlist');
    const container = document.getElementById('select-setlist-container');
    const closeBtn = document.getElementById('btn-close-select-setlist');

    if (modal && container) {
        const lists = await dbBrowser.getAllSetlists();
        container.innerHTML = '';

        if (lists.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-500 py-4">No hay setlists disponibles</p>';
        } else {
            lists.forEach(list => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-3 bg-slate-700 hover:bg-orange-600 text-white rounded-lg transition-colors flex justify-between items-center group';
                btn.innerHTML = `<span>${list.name}</span><span class="opacity-0 group-hover:opacity-100">➕</span>`;
                btn.onclick = async () => {
                    await dbBrowser.addSongToSetlist(list.id, currentSong.id);
                    alert(`Añadida a: ${list.name}`);
                    modal.classList.add('hidden');
                };
                container.appendChild(btn);
            });
        }
        modal.classList.remove('hidden');
    }
};

if (ctxSetlistsSubmenuTrigger) {
    ctxSetlistsSubmenuTrigger.onmouseenter = () => {
        if (ctxSetlistsSubmenu) ctxSetlistsSubmenu.classList.remove('hidden');
    };
}

window.onclick = (e) => {
    if (contextMenu) contextMenu.classList.add('hidden');
    if (ctxSetlistsSubmenu) ctxSetlistsSubmenu.classList.add('hidden');
};

if (ctxEdit) ctxEdit.onclick = () => {
    if (currentSong) {
        btnEditCurrent.onclick();
    }
};

if (ctxDelete) ctxDelete.onclick = () => {
    if (currentSong) {
        if (currentSong.isSetlist) {
            if (confirm('¿Estás seguro de eliminar la lista "' + currentSong.title + '"?')) {
                dbBrowser.deleteSetlist(currentSong.id).then(() => {
                    loadSetlists();
                    contextMenu.classList.add('hidden');
                });
            }
        } else if (confirm('¿Estás seguro de eliminar la canción "' + currentSong.title + '" de tu biblioteca?')) {
            dbBrowser.deleteSong(currentSong.id).then(() => {
                loadAllSongs();
                contextMenu.classList.add('hidden');
            });
        }
    }
};

if (ctxRemoveSetlist) ctxRemoveSetlist.onclick = async () => {
    if (currentSong && currentSetlistId) {
        if (confirm(`¿Quitar "${currentSong.title}" de la lista actual?`)) {
            await dbBrowser.removeSongFromSetlist(currentSetlistId, currentSong.id);
            const songsInList = await dbBrowser.getSongsInSetlist(currentSetlistId);
            renderSongList(songsInList, true);
            contextMenu.classList.add('hidden');
            alert("Canción quitada del setlist");
        }
    } else if (currentSong && !currentSetlistId) {
        alert("Selecciona un Setlist primero para quitar canciones");
    }
};

// --- Resto de funciones ---
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
if (fsBtnDown) fsBtnDown.onclick = () => { currentTranspose--; renderFsSong(); };

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
    if (line.trim() === '') return '<div><br></div>';

    // Detectamos si la línea contiene acordes sin destruir los espacios
    const chordRegex = /([A-G][#b]?(m|maj|min|dim|aug|sus|add)?([0-9]|11|13)?([#b])?(\/[A-G][#b]?)?)/gi;

    // Verificamos si es una línea "pura" de acordes (solo acordes y espacios)
    const onlyChordsAndSpaces = line.replace(chordRegex, '').trim() === '';

    // Una línea es de acordes si es pura o si contiene acordes y no es forzada a letra
    const isChordLine = onlyChordsAndSpaces || (!forceLyric && chordRegex.test(line));

    if (isChordLine) {
        // Usamos replace con una función para envolver cada acorde en un span
        // pero manteniendo TODOS los espacios originales alrededor
        const transposed = line.replace(chordRegex, (match) => {
            return '<span class="chord">' + transposeChordCore(match, currentTranspose) + '</span>';
        });
        return '<div class="chord-line">' + transposed + '</div>';
    } else {
        // Para las líneas de letra, simplemente envolvemos el contenido
        // Manteniendo los espacios originales
        return '<div class="lyric-line">' + line + '</div>';
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
