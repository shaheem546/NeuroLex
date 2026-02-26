/* ── Login Page Modals ──
 * Handles: Terms & Conditions, Privacy Policy, Forgot Password modals
 * Extracted from inline <script> to comply with Helmet CSP.
 */

document.addEventListener('DOMContentLoaded', function () {

    // ── Terms & Conditions modal ──
    var termsLink = document.getElementById('termsLink');
    if (termsLink) {
        termsLink.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('termsModal').classList.add('show');
        });
    }

    // ── Privacy Policy modal ──
    var privacyLink = document.getElementById('privacyLink');
    if (privacyLink) {
        privacyLink.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('privacyModal').classList.add('show');
        });
    }

    // ── Close buttons (X) for all modals ──
    document.querySelectorAll('.legal-modal-close').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = document.getElementById(btn.dataset.close);
            if (target) target.classList.remove('show');
        });
    });

    // ── Click outside modal to close ──
    document.querySelectorAll('.legal-modal-overlay').forEach(function (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.classList.remove('show');
        });
    });

    // ── Forgot Password modal ──
    var forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('forgotStep1').style.display = '';
            document.getElementById('forgotStep2').style.display = 'none';
            document.getElementById('forgotError').style.display = 'none';
            document.getElementById('forgotEmail').value = '';
            document.getElementById('forgotModal').classList.add('show');
        });
    }

    // ── Forgot password submit ──
    var forgotBtn = document.getElementById('forgotSubmitBtn');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', async function () {
            var email = document.getElementById('forgotEmail').value.trim();
            var errEl = document.getElementById('forgotError');
            var btn = this;

            if (!email || !email.includes('@')) {
                errEl.textContent = 'Please enter a valid email address.';
                errEl.style.display = 'block';
                return;
            }
            errEl.style.display = 'none';
            btn.querySelector('span').textContent = 'Sending...';
            btn.querySelector('i').className = 'fas fa-spinner fa-spin';
            btn.disabled = true;

            try {
                var res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                var data = await res.json();
                document.getElementById('forgotStep1').style.display = 'none';
                document.getElementById('forgotStep2').style.display = '';
            } catch (err) {
                errEl.textContent = 'Something went wrong. Please try again.';
                errEl.style.display = 'block';
            }

            btn.querySelector('span').textContent = 'Send Reset Link';
            btn.querySelector('i').className = 'fas fa-arrow-right';
            btn.disabled = false;
        });
    }

    // ── Forgot password "Back to Sign In" button ──
    var forgotDone = document.getElementById('forgotDoneBtn');
    if (forgotDone) {
        forgotDone.addEventListener('click', function () {
            document.getElementById('forgotModal').classList.remove('show');
        });
    }

});
