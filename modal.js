// Global modal functions for browser compatibility
(function() {
    'use strict';
    
    var modalOverlay = document.getElementById('custom-modal-overlay');
    var modalTitleElem = document.getElementById('modal-title');
    var modalMessageElem = document.getElementById('modal-message');
    var modalActionsElem = document.getElementById('modal-actions');

    /**
     * Displays a simple alert modal with a message and an "OK" button.
     * @param {string} message - The message to display.
     * @param {string} [title='تنبيه'] - The title of the modal.
     * @returns {Promise<void>} A promise that resolves when the user clicks "OK".
     */
    function showAlert(message, title) {
        title = title || 'تنبيه';
        if (modalTitleElem) modalTitleElem.textContent = title;
        if (modalMessageElem) modalMessageElem.textContent = message;
        if (modalActionsElem) modalActionsElem.innerHTML = '<button class="submit-btn">موافق</button>';
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            // Add entrance animation
            var modalContent = modalOverlay.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        }

        return new Promise(function(resolve) {
            if (modalActionsElem) {
                var button = modalActionsElem.querySelector('button');
                if (button) {
                    button.onclick = function() {
                        if (modalOverlay) modalOverlay.classList.add('hidden');
                        resolve();
                    };
                    // Focus the button for better accessibility
                    setTimeout(function() { button.focus(); }, 100);
                }
            }
        });
    }

    /**
     * Displays a confirmation modal with "Confirm" and "Cancel" buttons.
     * @param {string} message - The confirmation message to display.
     * @param {string} [title='تأكيد'] - The title of the modal.
     * @returns {Promise<boolean>} A promise that resolves with `true` if confirmed, `false` if canceled.
     */
    function showConfirm(message, title) {
        title = title || 'تأكيد';
        if (modalTitleElem) modalTitleElem.textContent = title;
        if (modalMessageElem) modalMessageElem.textContent = message;
        if (modalActionsElem) {
            modalActionsElem.innerHTML = 
                '<button class="submit-btn" id="modal-confirm-btn">تأكيد</button>' +
                '<button class="cancel-btn" id="modal-cancel-btn">إلغاء</button>';
        }
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            // Add entrance animation
            var modalContent = modalOverlay.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        }

        return new Promise(function(resolve) {
            var confirmBtn = document.getElementById('modal-confirm-btn');
            var cancelBtn = document.getElementById('modal-cancel-btn');

            if (confirmBtn) {
                confirmBtn.onclick = function() {
                    if (modalOverlay) modalOverlay.classList.add('hidden');
                    resolve(true);
                };
                // Focus the confirm button for better accessibility
                setTimeout(function() { confirmBtn.focus(); }, 100);
            }
            if (cancelBtn) {
                cancelBtn.onclick = function() {
                    if (modalOverlay) modalOverlay.classList.add('hidden');
                    resolve(false);
                };
            }
            
            // Allow ESC key to cancel
            var escHandler = function(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    if (modalOverlay) modalOverlay.classList.add('hidden');
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    // Close modal when clicking outside of it
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                var cancelBtn = document.getElementById('modal-cancel-btn');
                if (cancelBtn) {
                    cancelBtn.click();
                } else {
                    var okBtn = modalActionsElem.querySelector('.submit-btn');
                    if (okBtn) okBtn.click();
                }
            }
        });
    }

    // Make functions globally accessible
    window.showAlert = showAlert;
    window.showConfirm = showConfirm;
})();