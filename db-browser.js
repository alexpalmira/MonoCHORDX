/**
 * db-browser.js
 * Capa de persistencia utilizando IndexedDB para la versión PWA.
 * Esta clase imita la funcionalidad de la base de datos SQLite original.
 */

class DBBrowser {
    constructor() {
        this.dbName = 'CifraLocalDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Error abriendo IndexedDB:', event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store de canciones
                if (!db.objectStoreNames.contains('songs')) {
                    const songStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
                    songStore.createIndex('title', 'title', { unique: false });
                    songStore.createIndex('artist', 'artist', { unique: false });
                }

                // Store de setlists
                if (!db.objectStoreNames.contains('setlists')) {
                    db.createObjectStore('setlists', { keyPath: 'id', autoIncrement: true });
                }

                // Store de relación canciones <-> setlists
                if (!db.objectStoreNames.contains('setlist_songs')) {
                    const relStore = db.createObjectStore('setlist_songs', { keyPath: 'id', autoIncrement: true });
                    relStore.createIndex('setlistId', 'setlistId', { unique: false });
                    relStore.createIndex('songId', 'songId', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB conectada con éxito');
                resolve(this.db);
            };
        });
    }

    async _getTransaction(storeName, mode = 'readonly') {
        const db = await this.init();
        return db.transaction(storeName, mode).objectStore(storeName);
    }

    // ==========================================
    // 🎵 FUNCIONES DE CANCIONES
    // ==========================================

    async saveSong(song) {
        const store = await this._getTransaction('songs', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(song);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllSongs() {
        const store = await this._getTransaction('songs');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchSongs(query) {
        const songs = await this.getAllSongs();
        const q = query.toLowerCase();
        return songs.filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q)
        );
    }

    async deleteSong(id) {
        const store = await this._getTransaction('songs', 'readwrite');
        const relStore = await this._getTransaction('setlist_songs', 'readwrite');

        await new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        const allRels = await new Promise(res => {
            const req = relStore.getAll();
            req.onsuccess = () => res(req.result);
        });

        for (const rel of allRels) {
            if (rel.songId === id) {
                relStore.delete(rel.id);
            }
        }
    }

    // ==========================================
    // 📂 FUNCIONES DE SETLISTS
    // ==========================================

    async createSetlist(name) {
        const store = await this._getTransaction('setlists', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add({ name });
            request.onsuccess = () => resolve({ id: request.result, name });
            request.onerror = () => reject(request.error);
        });
    }

    async getAllSetlists() {
        const store = await this._getTransaction('setlists');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteSetlist(id) {
        const store = await this._getTransaction('setlists', 'readwrite');
        const relStore = await this._getTransaction('setlist_songs', 'readwrite');

        await new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        const allRels = await new Promise(res => {
            const req = relStore.getAll();
            req.onsuccess = () => res(req.result);
        });

        for (const rel of allRels) {
            if (rel.setlistId === id) {
                relStore.delete(rel.id);
            }
        }
    }

    async addSongToSetlist(setlistId, songId) {
        const store = await this._getTransaction('setlist_songs', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add({ setlistId, songId });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSongsInSetlist(setlistId) {
        const relStore = await this._getTransaction('setlist_songs');
        const songStore = await this._getTransaction('songs');

        const relations = await new Promise((resolve) => {
            const request = relStore.getAll();
            request.onsuccess = () => resolve(request.result);
        });

        const songIds = relations
            .filter(rel => rel.setlistId === setlistId)
            .map(rel => rel.songId);

        const songs = await Promise.all(
            songIds.map(id => new Promise(res => {
                const req = songStore.get(id);
                req.onsuccess = () => res(req.result);
            }))
        );

        return songs.filter(s => s !== undefined);
    }

    // ==========================================
    // 💾 BACKUP Y RESTAURACIÓN
    // ==========================================

    async exportDatabase() {
        const songs = await this.getAllSongs();
        const setlists = await this.getAllSetlists();
        const relations = await new Promise(res => {
            this._getTransaction('setlist_songs').then(store => {
                const req = store.getAll();
                req.onsuccess = () => res(req.result);
            });
        });

        return {
            version: 1,
            exportDate: new Date().toISOString(),
            songs,
            setlists,
            relations
        };
    }

    async importDatabase(data) {
        if (!data || !data.songs) throw new Error("Formato de respaldo inválido");

        const stores = ['songs', 'setlists', 'setlist_songs'];
        for (const storeName of stores) {
            const store = await this._getTransaction(storeName, 'readwrite');
            await new Promise(res => {
                const req = store.clear();
                req.onsuccess = () => res();
            });
        }

        const songStore = await this._getTransaction('songs', 'readwrite');
        for (const song of data.songs) {
            await new Promise(res => {
                const req = songStore.put(song);
                req.onsuccess = () => res();
            });
        }

        const setlistStore = await this._getTransaction('setlists', 'readwrite');
        for (const list of data.setlists) {
            await new Promise(res => {
                const req = setlistStore.put(list);
                req.onsuccess = () => res();
            });
        }

        const relStore = await this._getTransaction('setlist_songs', 'readwrite');
        for (const rel of data.relations) {
            await new Promise(res => {
                const req = relStore.put(rel);
                req.onsuccess = () => res();
            });
        }
    }
}

const dbBrowser = new DBBrowser();
if (typeof module !== 'undefined') {
    module.exports = dbBrowser;
} else {
    window.dbBrowser = dbBrowser;
}
