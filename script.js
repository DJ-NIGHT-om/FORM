// Main script for browser compatibility
(function() {
    'use strict';
    
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                })
                .catch(function(error) {
                    console.log('ServiceWorker registration failed');
                });
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        // Check if the GAS_URL_ENDPOINT is configured
        if (!window.GAS_URL_ENDPOINT || window.GAS_URL_ENDPOINT === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE' || window.GAS_URL_ENDPOINT.indexOf('https://script.google.com') !== 0) {
            window.showAlert('الرجاء اتباع التعليمات في ملف config.js وإضافة رابط Google Apps Script الصحيح.');
            window.showLoading(false);
            return;
        }

        var dom = window.getDOMElements();
        var allPlaylists = [];
        var syncInterval;

        /**
         * Syncs data from Google Sheets and updates both main page and archive
         */
        function syncDataFromSheet() {
            return window.fetchPlaylistsFromSheet()
                .then(function(data) {
                    var today = new Date();
                    today.setHours(23, 59, 59, 999);

                    var currentPlaylists = [];
                    var playlistsToArchive = [];
                    var localArchive = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
                    var localArchiveIds = {};
                    
                    // Create a lookup for archived IDs
                    for (var i = 0; i < localArchive.length; i++) {
                        localArchiveIds[localArchive[i].id.toString()] = true;
                    }

                    // Process fetched data
                    for (var i = 0; i < data.length; i++) {
                        var playlist = data[i];
                        var eventDate = new Date(playlist.date);
                        eventDate.setMinutes(eventDate.getMinutes() + eventDate.getTimezoneOffset());

                        if (!isNaN(eventDate.getTime()) && eventDate < today) {
                            // This should be archived
                            if (!localArchiveIds[playlist.id.toString()]) {
                                playlistsToArchive.push(playlist);
                            } else {
                                // Update existing archived item
                                for (var j = 0; j < localArchive.length; j++) {
                                    if (localArchive[j].id.toString() === playlist.id.toString()) {
                                        localArchive[j] = playlist;
                                        break;
                                    }
                                }
                            }
                        } else {
                            // This should be on main page
                            currentPlaylists.push(playlist);
                            
                            // If it was in archive but date changed, remove from archive
                            if (localArchiveIds[playlist.id.toString()]) {
                                localArchive = localArchive.filter(function(p) {
                                    return p.id.toString() !== playlist.id.toString();
                                });
                            }
                        }
                    }

                    // Check for deleted items in Google Sheet and remove from archive
                    var sheetIds = {};
                    for (var i = 0; i < data.length; i++) {
                        sheetIds[data[i].id.toString()] = true;
                    }
                    localArchive = localArchive.filter(function(p) {
                        return sheetIds[p.id.toString()];
                    });

                    // Update local archive
                    if (playlistsToArchive.length > 0) {
                        localArchive = localArchive.concat(playlistsToArchive);
                    }
                    localStorage.setItem('archivedPlaylists', JSON.stringify(localArchive));

                    // Update main page display
                    allPlaylists = currentPlaylists.sort(function(a, b) {
                        return new Date(a.date) - new Date(b.date);
                    });
                    window.renderPlaylists(dom.playlistSection, allPlaylists);

                    // Trigger archive page update if it's open
                    if (window.location.pathname.indexOf('user.html') !== -1) {
                        if (window.CustomEvent) {
                            window.dispatchEvent(new CustomEvent('archiveUpdate'));
                        } else {
                            // IE11 fallback
                            var event = document.createEvent('CustomEvent');
                            event.initCustomEvent('archiveUpdate', false, false, null);
                            window.dispatchEvent(event);
                        }
                    }
                })
                .catch(function(error) {
                    console.error('Error syncing data:', error);
                    // Don't show error to user for background sync
                });
        }

        /**
         * Starts the real-time sync interval
         */
        function startRealTimeSync() {
            // Sync every 5 seconds
            syncInterval = setInterval(syncDataFromSheet, 5000);
        }

        /**
         * Stops the real-time sync interval
         */
        function stopRealTimeSync() {
            if (syncInterval) {
                clearInterval(syncInterval);
                syncInterval = null;
            }
        }

        /**
         * Fetches playlists, separates current from archived, displays current ones,
         * and archives the old ones.
         */
        function initializePage() {
            window.showLoading(true);
            return window.fetchPlaylistsFromSheet()
                .then(function(data) {
                    var today = new Date();
                    today.setHours(23, 59, 59, 999); // Set to end of today

                    var currentPlaylists = [];
                    var playlistsToArchive = [];
                    var localArchive = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
                    var localArchiveIds = {};
                    
                    for (var i = 0; i < localArchive.length; i++) {
                        localArchiveIds[localArchive[i].id.toString()] = true;
                    }

                    for (var i = 0; i < data.length; i++) {
                        var playlist = data[i];
                        var eventDate = new Date(playlist.date);
                        eventDate.setMinutes(eventDate.getMinutes() + eventDate.getTimezoneOffset());

                        if (!isNaN(eventDate.getTime()) && eventDate < today) {
                            if (!localArchiveIds[playlist.id.toString()]) {
                                playlistsToArchive.push(playlist);
                            }
                        } else {
                            currentPlaylists.push(playlist);
                        }
                    }
                    
                    allPlaylists = currentPlaylists.sort(function(a, b) {
                        return new Date(a.date) - new Date(b.date);
                    });
                    window.renderPlaylists(dom.playlistSection, allPlaylists);

                    if (playlistsToArchive.length > 0) {
                        return archivePlaylists(playlistsToArchive);
                    }
                })
                .catch(function(error) {
                    console.error('Error initializing page:', error);
                    window.showAlert('حدث خطأ أثناء جلب البيانات. تأكد من صحة الرابط والأذونات، وأن الصف الأول في جوجل شيت يحتوي على العناوين الصحيحة.');
                })
                .finally(function() {
                    window.showLoading(false);
                });
        }

        /**
         * Stores playlists in local storage and sends a request to delete them from the sheet.
         * @param {Array} playlistsToArchive - An array of playlist objects to archive.
         */
        function archivePlaylists(playlistsToArchive) {
            try {
                // Get current local archive
                var localArchive = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
                
                // Remove any existing entries with the same IDs to prevent duplicates
                var idsToArchive = [];
                for (var i = 0; i < playlistsToArchive.length; i++) {
                    idsToArchive.push(playlistsToArchive[i].id.toString());
                }
                
                localArchive = localArchive.filter(function(p) {
                    return idsToArchive.indexOf(p.id.toString()) === -1;
                });
                
                // Add new playlists to local archive
                var updatedArchive = localArchive.concat(playlistsToArchive);
                localStorage.setItem('archivedPlaylists', JSON.stringify(updatedArchive));
                
                // Send request to delete from sheet
                var idsToDelete = [];
                for (var i = 0; i < playlistsToArchive.length; i++) {
                    idsToDelete.push(playlistsToArchive[i].id);
                }
                
                return window.postDataToSheet({ action: 'archive', ids: idsToDelete });
            } catch (error) {
                console.error('Error archiving playlists in Google Sheet:', error);
                window.showAlert('حدث خطأ أثناء أرشفة بعض القوائم. سيتم إعادة المحاولة في التحميل القادم.');
            }
        }
        
        /**
         * Handles the form submission for adding or editing a playlist.
         * @param {Event} e - The form submit event.
         */
        function handleFormSubmit(e) {
            e.preventDefault();
            window.showLoading(true);

            var songInputs = dom.songsContainer.querySelectorAll('.song-input');
            var songs = [];
            for (var i = 0; i < songInputs.length; i++) {
                var songValue = songInputs[i].value.trim();
                if (songValue) {
                    songs.push(songValue);
                }
            }
            
            var playlistId = dom.playlistIdInput.value;

            var playlistData = {
                action: playlistId ? 'edit' : 'add',
                id: playlistId,
                date: dom.eventDateInput.value,
                location: dom.eventLocationInput.value,
                brideZaffa: dom.brideZaffaInput.value,
                groomZaffa: dom.groomZaffaInput.value,
                songs: songs
            };

            window.postDataToSheet(playlistData)
                .then(function(result) {
                    if (result.status === 'success') {
                        window.resetForm();
                        return initializePage();
                    } else {
                        throw new Error(result.message || 'Failed to save data.');
                    }
                })
                .catch(function(error) {
                    console.error('Error saving playlist:', error);
                    window.showAlert('حدث خطأ أثناء حفظ القائمة.');
                })
                .finally(function() {
                    window.showLoading(false);
                });
        }
        
        /**
         * Handles clicks on the edit and delete buttons within a playlist card.
         * @param {Event} e - The click event.
         */
        function handlePlaylistAction(e) {
            var card = e.target.closest('.playlist-card');
            if (!card) return;

            var playlistId = card.getAttribute('data-id');
            var isDeleteButton = e.target.closest('.delete-btn');
            var isEditButton = e.target.closest('.edit-btn');

            if (isDeleteButton) {
                window.showConfirm('هل أنت متأكد من حذف هذه القائمة؟')
                    .then(function(confirmed) {
                        if (confirmed) {
                            window.showLoading(true);
                            return window.postDataToSheet({ action: 'delete', id: playlistId });
                        }
                    })
                    .then(function(result) {
                        if (result) {
                            return initializePage();
                        }
                    })
                    .catch(function(error) {
                        console.error('Error deleting playlist:', error);
                        window.showAlert('حدث خطأ أثناء حذف القائمة.');
                        window.showLoading(false);
                    });
            } else if (isEditButton) {
                var playlist = null;
                for (var i = 0; i < allPlaylists.length; i++) {
                    if (allPlaylists[i].id == playlistId) {
                        playlist = allPlaylists[i];
                        break;
                    }
                }
                if (playlist) {
                    window.populateEditForm(playlist);
                }
            } else if (!isDeleteButton && !isEditButton) {
                // Clicked on the card itself (not on action buttons)
                toggleSongHighlight(card);
            }
        }

        /**
         * Toggles highlighting of songs in a playlist card
         * @param {HTMLElement} card - The playlist card element
         */
        function toggleSongHighlight(card) {
            // Remove highlighting from all other cards first
            var allCards = document.querySelectorAll('.playlist-card');
            for (var i = 0; i < allCards.length; i++) {
                if (allCards[i] !== card) {
                    allCards[i].classList.remove('selected');
                    var songItems = allCards[i].querySelectorAll('.playlist-songs li');
                    for (var j = 0; j < songItems.length; j++) {
                        songItems[j].classList.remove('song-highlighted');
                    }
                }
            }

            // Toggle highlighting for the clicked card
            var isCurrentlySelected = card.classList.contains('selected');
            if (isCurrentlySelected) {
                card.classList.remove('selected');
                var songItems = card.querySelectorAll('.playlist-songs li');
                for (var k = 0; k < songItems.length; k++) {
                    songItems[k].classList.remove('song-highlighted');
                }
            } else {
                card.classList.add('selected');
                var songItems = card.querySelectorAll('.playlist-songs li');
                for (var k = 0; k < songItems.length; k++) {
                    songItems[k].classList.add('song-highlighted');
                }
                
                // Force reflow to ensure icon colors are applied immediately
                card.offsetHeight;
            }
        }

        // --- Event Listeners ---
        if (dom.showFormBtn) {
            dom.showFormBtn.addEventListener('click', function() {
                window.showForm(true);
            });
        }
        if (dom.cancelBtn) {
            dom.cancelBtn.addEventListener('click', window.resetForm);
        }
        if (dom.addSongBtn) {
            dom.addSongBtn.addEventListener('click', function() {
                window.addSongField(dom.songsContainer, true);
            });
        }
        if (dom.playlistForm) {
            dom.playlistForm.addEventListener('submit', handleFormSubmit);
        }
        if (dom.playlistSection) {
            dom.playlistSection.addEventListener('click', handlePlaylistAction);
        }

        // --- Initial Load ---
        initializePage();
        window.resetForm(); // Reset form initially to set it up correctly (e.g., add first song field)
        window.showForm(false); // Then hide it
        
        // Start real-time synchronization
        startRealTimeSync();
        
        // Stop sync when page is hidden/unloaded
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                stopRealTimeSync();
            } else {
                startRealTimeSync();
            }
        });
        
        window.addEventListener('beforeunload', stopRealTimeSync);
    });
})();