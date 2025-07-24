// User page script for browser compatibility
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
        var playlistSection = document.getElementById('playlist-section');
        var deleteArchiveBtn = document.getElementById('delete-archive-btn');

        function displayArchivedPlaylists() {
            var archivedPlaylists = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
            
            if (playlistSection) {
                playlistSection.innerHTML = '';
                if (archivedPlaylists.length === 0) {
                    playlistSection.innerHTML = '<p class="card">الأرشيف فارغ حالياً.</p>';
                    return;
                }

                // Sort by most recent date first
                archivedPlaylists.sort(function(a, b) {
                    return new Date(b.date) - new Date(a.date);
                });

                for (var i = 0; i < archivedPlaylists.length; i++) {
                    var playlist = archivedPlaylists[i];
                    var songs = [];
                    try {
                        if (typeof playlist.songs === 'string' && playlist.songs.trim().indexOf('[') === 0) {
                            var parsedSongs = JSON.parse(playlist.songs);
                            if (Array.isArray(parsedSongs)) {
                                songs = parsedSongs;
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing songs for archived playlist ID ' + playlist.id, e);
                    }
                    
                    var songsHtml = songs.length > 0 ? 
                        '<ol>' + songs.map(function(song) { return '<li>' + song + '</li>'; }).join('') + '</ol>' : 
                        '<p>لا يوجد أغاني إضافية.</p>';

                    var eventDate = new Date(playlist.date);
                    var dateString = !isNaN(eventDate.getTime())
                        ? eventDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'تاريخ غير محدد';

                    var card = document.createElement('div');
                    card.className = 'playlist-card card';
                    card.setAttribute('data-id', playlist.id);
                    card.innerHTML = 
                        '<div class="playlist-card-header">' +
                             '<h3><i class="fas fa-map-marker-alt icon"></i> ' + (playlist.location || 'مكان غير محدد') + '</h3>' +
                             '<span><i class="fas fa-calendar-alt icon"></i> ' + dateString + '</span>' +
                        '</div>' +
                        '<div class="playlist-card-info">' +
                            '<p><i class="fas fa-female icon"></i> <strong>زفة العروس:</strong> ' + (playlist.brideZaffa || 'غير محدد') + '</p>' +
                            '<p><i class="fas fa-male icon"></i> <strong>زفة المعرس:</strong> ' + (playlist.groomZaffa || 'غير محدد') + '</p>' +
                        '</div>' +
                        '<div class="playlist-songs">' +
                            '<h4><i class="fas fa-music icon"></i> قائمة الأغاني:</h4>' +
                            songsHtml +
                        '</div>' +
                        '<div class="playlist-actions">' +
                            '<button class="action-btn delete-btn single-delete-btn"><i class="fas fa-trash-alt"></i> حذف من الأرشيف</button>' +
                        '</div>';
                    playlistSection.appendChild(card);
                }
            }
        }

        function clearAllArchives() {
            window.showConfirm('هل أنت متأكد من حذف جميع بيانات الأرشيف نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')
                .then(function(confirmed) {
                    if (confirmed) {
                        localStorage.removeItem('archivedPlaylists');
                        displayArchivedPlaylists();
                    }
                });
        }
        
        function deleteSingleArchive(id) {
            window.showConfirm('هل أنت متأكد من حذف هذه القائمة من الأرشيف؟')
                .then(function(confirmed) {
                    if (confirmed) {
                        // Try to delete from Google Sheet as well to ensure consistency
                        window.postDataToSheet({ action: 'delete', id: id })
                            .catch(function(error) {
                                console.error('Error deleting from Google Sheet:', error);
                                // Continue with local deletion even if Google Sheet deletion fails
                            })
                            .finally(function() {
                                var archivedPlaylists = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
                                var updatedArchive = archivedPlaylists.filter(function(p) {
                                    return p.id.toString() !== id.toString();
                                });
                                localStorage.setItem('archivedPlaylists', JSON.stringify(updatedArchive));
                                displayArchivedPlaylists();
                            });
                    }
                });
        }

        /**
         * Toggles highlighting of songs in an archived playlist card
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

        if (playlistSection) {
            playlistSection.addEventListener('click', function(e) {
                var deleteButton = e.target.closest('.single-delete-btn');
                if (deleteButton) {
                    var card = e.target.closest('.playlist-card');
                    if (card && card.getAttribute('data-id')) {
                        deleteSingleArchive(card.getAttribute('data-id'));
                    }
                } else {
                    // Check if clicked on the card itself (not on action buttons)
                    var card = e.target.closest('.playlist-card');
                    if (card && !e.target.closest('.playlist-actions')) {
                        toggleSongHighlight(card);
                    }
                }
            });
        }

        if (deleteArchiveBtn) {
            deleteArchiveBtn.addEventListener('click', clearAllArchives);
        }

        // Listen for archive updates from main page sync
        window.addEventListener('archiveUpdate', displayArchivedPlaylists);

        // Initial load
        displayArchivedPlaylists();
        
        // Refresh archive every 5 seconds to sync with Google Sheets changes
        setInterval(displayArchivedPlaylists, 5000);
    });
})();