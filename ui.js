// Global UI functions for browser compatibility
(function() {
    'use strict';
    
    // A cache for DOM elements to avoid repeated lookups
    var dom = {};

    /**
     * Queries and caches essential DOM elements from the main page.
     * @returns {object} An object containing the DOM elements.
     */
    function getDOMElements() {
        if (Object.keys(dom).length === 0) {
            dom.loadingOverlay = document.getElementById('loading-overlay');
            dom.formSection = document.getElementById('form-section');
            dom.playlistForm = document.getElementById('playlist-form');
            dom.playlistSection = document.getElementById('playlist-section');
            dom.showFormBtn = document.getElementById('show-form-btn');
            dom.cancelBtn = document.getElementById('cancel-btn');
            dom.songsContainer = document.getElementById('songs-container');
            dom.addSongBtn = document.getElementById('add-song-btn');
            dom.formTitle = document.getElementById('form-title');
            dom.saveBtn = document.getElementById('save-btn');
            // Form inputs
            dom.playlistIdInput = document.getElementById('playlistId');
            dom.eventDateInput = document.getElementById('eventDate');
            dom.eventLocationInput = document.getElementById('eventLocation');
            dom.brideZaffaInput = document.getElementById('brideZaffa');
            dom.groomZaffaInput = document.getElementById('groomZaffa');
        }
        return dom;
    }

    /**
     * Shows or hides the loading overlay.
     * @param {boolean} show - `true` to show, `false` to hide.
     */
    function showLoading(show) {
        var loadingOverlay = getDOMElements().loadingOverlay;
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.remove('hidden');
            } else {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    /**
     * Shows or hides the main form section.
     * @param {boolean} show - `true` to show, `false` to hide.
     */
    function showForm(show) {
        var elements = getDOMElements();
        var formSection = elements.formSection;
        var showFormBtn = elements.showFormBtn;
        
        if (formSection) {
            if (show) {
                formSection.classList.remove('hidden');
            } else {
                formSection.classList.add('hidden');
            }
        }
        if (showFormBtn) {
            if (show) {
                showFormBtn.classList.add('hidden');
            } else {
                showFormBtn.classList.remove('hidden');
            }
        }
        if (show) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Adds a new song input field to the form.
     * @param {HTMLElement} container - The container to add the song field to.
     * @param {boolean} focusNew - Whether to focus the new input field.
     * @param {string} [value=''] - An optional initial value for the input.
     */
    function addSongField(container, focusNew, value) {
        value = value || '';
        var group = document.createElement('div');
        group.className = 'song-input-group';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'song-input';
        input.placeholder = 'أدخل اسم الأغنية';
        input.value = value;

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSongField(container, true);
            }
        });

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-song-btn';
        removeBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        removeBtn.onclick = function() {
            if (group.parentNode) {
                group.parentNode.removeChild(group);
            }
        };

        group.appendChild(input);
        group.appendChild(removeBtn);
        container.appendChild(group);

        if (focusNew) {
            input.focus();
        }
    }

    /**
     * Resets the form to its initial state.
     */
    function resetForm() {
        var elements = getDOMElements();
        var playlistForm = elements.playlistForm;
        var songsContainer = elements.songsContainer;
        var playlistIdInput = elements.playlistIdInput;
        var formTitle = elements.formTitle;
        var saveBtn = elements.saveBtn;
        
        if (playlistForm) playlistForm.reset();
        if (songsContainer) songsContainer.innerHTML = '';
        if (playlistIdInput) playlistIdInput.value = '';
        if (formTitle) formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة قائمة جديدة';
        if (saveBtn) saveBtn.textContent = 'حفظ البيانات';
        if (songsContainer) addSongField(songsContainer, false); // Add one empty song field
        showForm(false);
    }

    /**
     * Populates the form with data from a playlist for editing.
     * @param {object} playlist - The playlist object to edit.
     */
    function populateEditForm(playlist) {
        var elements = getDOMElements();
        
        resetForm();
        showForm(true);
        
        if (elements.formTitle) elements.formTitle.innerHTML = '<i class="fas fa-edit"></i> تعديل القائمة';
        if (elements.saveBtn) elements.saveBtn.textContent = 'حفظ التعديلات';
        if (elements.playlistIdInput) elements.playlistIdInput.value = playlist.id;

        var eventDate = new Date(playlist.date);
        if (!isNaN(eventDate.getTime())) {
            eventDate.setMinutes(eventDate.getMinutes() - eventDate.getTimezoneOffset());
            if (elements.eventDateInput) elements.eventDateInput.value = eventDate.toISOString().split('T')[0];
        } else {
            if (elements.eventDateInput) elements.eventDateInput.value = '';
        }

        if (elements.eventLocationInput) elements.eventLocationInput.value = playlist.location;
        if (elements.brideZaffaInput) elements.brideZaffaInput.value = playlist.brideZaffa;
        if (elements.groomZaffaInput) elements.groomZaffaInput.value = playlist.groomZaffa;
        
        if (elements.songsContainer) {
            elements.songsContainer.innerHTML = '';
            var songs = [];
            try {
                if (typeof playlist.songs === 'string' && playlist.songs.trim().indexOf('[') === 0) {
                    var parsedSongs = JSON.parse(playlist.songs);
                    if (Array.isArray(parsedSongs)) {
                        songs = parsedSongs;
                    }
                }
            } catch(e) { 
                console.error('Error parsing songs for editing:', e); 
            }

            for (var i = 0; i < songs.length; i++) {
                addSongField(elements.songsContainer, false, songs[i]);
            }
            addSongField(elements.songsContainer, true); // Add one empty field at the end and focus it
        }
    }

    /**
     * Renders the list of playlist cards on the page.
     * @param {HTMLElement} container - The element to render the cards into.
     * @param {Array} playlists - An array of playlist objects.
     */
    function renderPlaylists(container, playlists) {
        if (!container) return;
        
        container.innerHTML = '';
        if (!playlists || playlists.length === 0) {
            container.innerHTML = '<p class="card">لا توجد قوائم حالياً. انقر على زر الإنشاء لإضافة واحدة!</p>';
            return;
        }
        
        for (var i = 0; i < playlists.length; i++) {
            var playlist = playlists[i];
            var songs = [];
            try {
                if (typeof playlist.songs === 'string' && playlist.songs.trim().indexOf('[') === 0) {
                    var parsedSongs = JSON.parse(playlist.songs);
                    if (Array.isArray(parsedSongs)) {
                        songs = parsedSongs;
                    }
                }
            } catch (e) { 
                console.error('Error parsing songs for display:', e); 
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
                    '<button class="action-btn edit-btn"><i class="fas fa-edit"></i> تعديل</button>' +
                    '<button class="action-btn delete-btn"><i class="fas fa-trash-alt"></i> حذف</button>' +
                '</div>';
            container.appendChild(card);
        }
    }

    // Make functions globally accessible
    window.getDOMElements = getDOMElements;
    window.showLoading = showLoading;
    window.showForm = showForm;
    window.addSongField = addSongField;
    window.resetForm = resetForm;
    window.populateEditForm = populateEditForm;
    window.renderPlaylists = renderPlaylists;
})();