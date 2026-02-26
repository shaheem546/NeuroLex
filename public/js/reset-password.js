/* ── Reset Password Page Script ──
 * Handles token validation, password strength, and password reset submission.
 * Extracted from inline <script> to comply with Helmet CSP.
 */

document.addEventListener('DOMContentLoaded', function () {

    // Get token from URL
    var urlParams = new URLSearchParams(window.location.search);
    var resetToken = urlParams.get('token');

    // If no token, show error
    if (!resetToken) {
        document.getElementById('resetStep1').style.display = 'none';
        document.getElementById('resetStep3').style.display = '';
        document.getElementById('backLink').style.display = 'none';
    }

    // Password toggle
    document.querySelectorAll('.toggle-pw').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var field = document.getElementById(this.dataset.field);
            var icon = this.querySelector('i');
            if (field.type === 'password') {
                field.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                field.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // Password strength
    var pwInput = document.getElementById('newPassword');
    if (pwInput) {
        pwInput.addEventListener('input', function () {
            var pw = this.value;
            var bar = document.getElementById('strengthBar');
            var label = document.getElementById('strengthLabel');
            var score = 0;
            if (pw.length >= 8) score++;
            if (pw.length >= 12) score++;
            if (/[A-Z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^a-zA-Z0-9]/.test(pw)) score++;

            var pct = (score / 5) * 100;
            bar.style.width = pct + '%';
            if (score <= 1) { bar.style.background = '#ef4444'; label.textContent = 'Weak'; label.style.color = '#ef4444'; }
            else if (score <= 2) { bar.style.background = '#f59e0b'; label.textContent = 'Fair'; label.style.color = '#f59e0b'; }
            else if (score <= 3) { bar.style.background = '#3b82f6'; label.textContent = 'Good'; label.style.color = '#3b82f6'; }
            else { bar.style.background = '#22c55e'; label.textContent = 'Strong'; label.style.color = '#22c55e'; }

            if (!pw) { bar.style.width = '0%'; label.textContent = ''; }
        });
    }

    // Submit reset
    var resetBtn = document.getElementById('resetSubmitBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async function () {
            var pw = document.getElementById('newPassword').value;
            var confirmPw = document.getElementById('confirmNewPassword').value;
            var errEl = document.getElementById('resetError');
            var btn = this;

            errEl.style.display = 'none';

            if (pw.length < 8) {
                errEl.textContent = 'Password must be at least 8 characters long.';
                errEl.style.display = 'block';
                return;
            }

            if (pw !== confirmPw) {
                errEl.textContent = 'Passwords do not match.';
                errEl.style.display = 'block';
                return;
            }

            btn.querySelector('span').textContent = 'Resetting...';
            btn.querySelector('i').className = 'fas fa-spinner fa-spin';
            btn.disabled = true;

            try {
                var res = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: resetToken, newPassword: pw })
                });
                var data = await res.json();

                if (res.ok && data.status === 'success') {
                    document.getElementById('resetStep1').style.display = 'none';
                    document.getElementById('resetStep2').style.display = '';
                    document.getElementById('backLink').style.display = 'none';
                } else {
                    if (data.message && data.message.includes('expired')) {
                        document.getElementById('resetStep1').style.display = 'none';
                        document.getElementById('resetStep3').style.display = '';
                        document.getElementById('backLink').style.display = 'none';
                    } else {
                        errEl.textContent = data.message || 'Failed to reset password.';
                        errEl.style.display = 'block';
                    }
                }
            } catch (err) {
                errEl.textContent = 'Network error. Please try again.';
                errEl.style.display = 'block';
            }

            btn.querySelector('span').textContent = 'Reset Password';
            btn.querySelector('i').className = 'fas fa-arrow-right';
            btn.disabled = false;
        });
    }

});
