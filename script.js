// Global Application State Manager
const AppState = {
    theme: 'light', // light or dark
    direction: 'ltr', // ltr or rtl
    user: null, // logged-in user: { role: 'user'|'admin', email: '...', name: '...' }
    activeView: 'home1-view',
    activeDashboardPanel: 'user-overview',
    pricing: {
        rotation: 45,
        balancing: 60,
        rot_bal: 85,
        seasonal: 120
    },
    bookings: [
        {
            id: 'JOB-90210',
            customer: 'Sarah Jenkins',
            vehicle: 'Toyota RAV4',
            service: 'Rotation & Balancing',
            status: 'Pending Dispatch',
            address: '456 Oak Ave, 90210',
            date: '2026-06-15',
            price: 85.00
        }
    ],
    liveTracking: {
        vanPosition: 0, // 0 to 100 percent along path
        intervalId: null,
        eta: 12
    }
};

// Initial setup on window load
window.addEventListener('DOMContentLoaded', () => {
    // Read logged-in user from localStorage
    const savedUser = localStorage.getItem('tireglide_logged_in_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            performLogin(user.role, user.name, user.email);
        } catch (e) {
            console.error('Error parsing saved user', e);
        }
    }

    initThemeAndLang();
    initViewRouter();
    initMobileNav();
    initPriceEstimators();
    initTreadDepthGauge();
    initZipChecker();
    initTimelineH2();
    initQuickScheduler();
    initLoginModal();
    initUserDashboard();
    initAdminDashboard();
    initDateLimits();
    initActiveServiceFootprint();

    // Check for target view in query params
    const urlParams = new URLSearchParams(window.location.search);
    const targetView = urlParams.get('view');
    if (targetView) {
        switchView(targetView);
        // Clean URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Auto-fill dates and set minimum values (cannot book in the past)
function initDateLimits() {
    const today = new Date().toISOString().split('T')[0];
    const datePickerWiz = document.getElementById('wiz-date');
    const datePickerH2 = document.getElementById('scheduler-date-input');
    
    if (datePickerWiz) datePickerWiz.min = today;
    if (datePickerH2) datePickerH2.min = today;
}

/* ==========================================================================
   THEME AND DIRECTION (LTR/RTL) MANAGEMENT
   ========================================================================== */
function initThemeAndLang() {
    // Load persisted settings
    const savedTheme = localStorage.getItem('tireglide_theme') || 'light';
    const savedDir = localStorage.getItem('tireglide_dir') || 'ltr';

    setTheme(savedTheme);
    setDirection(savedDir);

    // Theme toggle click handlers
    const themeButtons = [
        'theme-toggle-btn',
        'mobile-theme-toggle-btn',
        'user-dashboard-theme-toggle-btn',
        'admin-dashboard-theme-toggle-btn',
        'login-theme-toggle-btn',
        'register-theme-toggle-btn'
    ];
    themeButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
                setTheme(newTheme);
            });
        }
    });

    // Direction (LTR/RTL) toggle click handlers
    const dirButtons = [
        'dir-toggle-btn',
        'mobile-dir-toggle-btn',
        'user-dashboard-dir-toggle-btn',
        'admin-dashboard-dir-toggle-btn',
        'login-dir-toggle-btn',
        'register-dir-toggle-btn'
    ];
    dirButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const newDir = AppState.direction === 'ltr' ? 'rtl' : 'ltr';
                setDirection(newDir);
            });
        }
    });
}

function setTheme(theme) {
    AppState.theme = theme;
    localStorage.setItem('tireglide_theme', theme);
    const htmlEl = document.documentElement;
    if (theme === 'dark') {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        htmlEl.classList.remove('light-theme');
        htmlEl.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        htmlEl.classList.remove('dark-theme');
        htmlEl.classList.add('light-theme');
    }
}

function setDirection(dir) {
    AppState.direction = dir;
    localStorage.setItem('tireglide_dir', dir);
    
    const htmlEl = document.documentElement;
    htmlEl.setAttribute('dir', dir);
    
    // Update Indicator Text for all buttons
    const dirButtons = [
        'dir-toggle-btn',
        'mobile-dir-toggle-btn',
        'user-dashboard-dir-toggle-btn',
        'admin-dashboard-dir-toggle-btn',
        'login-dir-toggle-btn',
        'register-dir-toggle-btn'
    ];
    dirButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.textContent = dir.toUpperCase();
        }
    });
}

function initViewRouter() {
    const triggers = document.querySelectorAll('.active-view-trigger');
    const progress = document.getElementById('transition-bar');

    triggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const target = trigger.getAttribute('data-target');
            if (target) {
                switchView(target);
            }
        });
    });

    // Logo Click -> Go to Home 1
    const logoBtn = document.getElementById('logo-btn');
    if (logoBtn) {
        logoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('home1-view');
        });
    }

    // Sidebar Logout buttons click handlers
    const logoutBtns = document.querySelectorAll('.sidebar-logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            AppState.user = null;
            
            // Reset indicators
            const userInd = document.getElementById('user-indicator');
            if (userInd) userInd.classList.add('hidden');
            const loginBtnEl = document.getElementById('login-modal-btn');
            if (loginBtnEl) loginBtnEl.classList.remove('hidden');
            
            // Redirect back to Home
            switchView('home1-view');
        });
    });
}

function switchView(viewId) {
    const progress = document.getElementById('transition-bar');
    
    // Trigger transition progress bar
    if (progress) {
        progress.style.width = '30%';
        setTimeout(() => {
            progress.style.width = '70%';
        }, 150);
    }

    // Close Mobile Menu if open
    const nav = document.getElementById('main-nav');
    if (nav) nav.classList.remove('open');

    // Toggle header visibility
    const headerEl = document.querySelector('.main-header');
    const mainContentEl = document.querySelector('.main-content');
    if (headerEl) {
        if (viewId === 'user-dashboard-view' || viewId === 'admin-dashboard-view') {
            headerEl.classList.add('hidden-header');
            if (mainContentEl) mainContentEl.classList.add('no-margin');
        } else {
            headerEl.classList.remove('hidden-header');
            if (mainContentEl) mainContentEl.classList.remove('no-margin');
        }
    }

    // Swap Views
    setTimeout(() => {
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active'));

        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            AppState.activeView = viewId;
            window.scrollTo(0, 0);
        }

        if (progress) {
            progress.style.width = '100%';
            setTimeout(() => {
                progress.style.width = '0%';
            }, 300);
        }

        updateActiveNavItem(viewId);

        // Initialize view specific simulations
        if (viewId === 'user-dashboard-view') {
            switchDashboardPanel('user-overview');
            runLiveTrackerSimulation();
        } else if (viewId === 'admin-dashboard-view') {
            switchDashboardPanel('admin-overview');
            renderAdminJobs();
        } else {
            // Stop any active simulations to conserve memory
            stopLiveTrackerSimulation();
        }
    }, 400);
}

function updateActiveNavItem(viewId) {
    const allLinks = document.querySelectorAll('.nav-link, .dropdown-item');
    allLinks.forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`.nav-link[data-target="${viewId}"]`) || document.querySelector(`.dropdown-item[data-target="${viewId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/* ==========================================================================
   MOBILE NAVIGATION MENU TOGGLER
   ========================================================================== */
function initMobileNav() {
    const toggle = document.getElementById('mobile-nav-toggle');
    const nav = document.getElementById('main-nav');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('open');
        });
    }

    // Handlers for mobile dropdown menus click toggle
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggleBtn => {
        toggleBtn.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const parent = toggleBtn.closest('.has-dropdown');
                if (parent) {
                    parent.classList.toggle('mobile-open');
                }
            }
        });
    });
}

/* ==========================================================================
   HOME 1: INTERACTIVE PRICE ESTIMATOR ENGINE
   ========================================================================== */
function initPriceEstimators() {
    const selectVehicle = document.getElementById('est-vehicle');
    const selectService = document.getElementById('est-service');
    const selectWheel = document.getElementById('est-wheel-size');

    if (selectVehicle && selectService && selectWheel) {
        const updateCalculations = () => {
            const vehicleMult = parseFloat(selectVehicle.options[selectVehicle.selectedIndex].getAttribute('data-multiplier'));
            const baseServiceVal = selectService.value;
            const sizeAddon = parseFloat(selectWheel.options[selectWheel.selectedIndex].getAttribute('data-addon'));
            
            // Fetch live base price configuration
            const basePrice = AppState.pricing[baseServiceVal] || 85;

            const basePriceRowVal = basePrice;
            const vehicleAdjustVal = basePrice * (vehicleMult - 1);
            const total = (basePrice * vehicleMult) + sizeAddon;

            // Update DOM display fields
            document.getElementById('est-base-price').textContent = `$${basePriceRowVal.toFixed(2)}`;
            document.getElementById('est-vehicle-adjust').textContent = `$${vehicleAdjustVal.toFixed(2)}`;
            document.getElementById('est-addon-price').textContent = `$${sizeAddon.toFixed(2)}`;
            document.getElementById('est-total-price').textContent = `$${total.toFixed(2)}`;
        };

        selectVehicle.addEventListener('change', updateCalculations);
        selectService.addEventListener('change', updateCalculations);
        selectWheel.addEventListener('change', updateCalculations);

        // Run initial configuration update
        updateCalculations();
    }
}

/* ==========================================================================
   HOME 1: TREAD DEPTH INTERACTIVE SLIDER
   ========================================================================== */
function initTreadDepthGauge() {
    const slider = document.getElementById('tread-depth-slider');
    const displayNum = document.getElementById('depth-readout-num');
    const ridges = document.getElementById('tread-ridges-bar');
    const banner = document.getElementById('tread-status-card');
    const title = document.getElementById('tread-status-title');
    const desc = document.getElementById('tread-status-desc');
    const icon = document.getElementById('tread-status-icon');

    if (slider && displayNum && ridges && banner) {
        slider.addEventListener('input', () => {
            const val = parseInt(slider.value);
            displayNum.textContent = val;
            
            // Set scale and visual border dash density based on depth
            ridges.style.borderWidth = `${10 + val * 1.5}px`;
            
            // Reset banner classes
            banner.className = 'tread-status-banner ';

            if (val >= 6) {
                // Safe Zone (Green)
                banner.classList.add('green-bg');
                title.textContent = `Safety Zone: Safe (${val}/32")`;
                desc.textContent = "Excellent wet-weather grip, minimum stopping distance. Meets tire manufacturer safety warranty rotation standards.";
                icon.className = 'fa-solid fa-circle-check text-green';
                ridges.style.borderColor = 'var(--success-color)';
            } else if (val >= 3) {
                // Caution Zone (Amber)
                banner.classList.add('amber-bg');
                title.textContent = `Safety Zone: Warning (${val}/32")`;
                desc.textContent = "Reduced performance in heavy rain. Rotations should be scheduled immediately to guarantee symmetric tread wear.";
                icon.className = 'fa-solid fa-triangle-exclamation text-amber';
                ridges.style.borderColor = 'var(--accent-color)';
            } else {
                // Critical Zone (Red)
                banner.classList.add('red-bg');
                title.textContent = `Safety Zone: Critical (${val}/32")`;
                desc.textContent = "Tire is legally bald. Risk of hydroplaning is severe. Braking distances are dangerously extended. Replacement required.";
                icon.className = 'fa-solid fa-skull-crossbones text-red';
                ridges.style.borderColor = 'var(--danger-color)';
            }
        });
    }
}

/* ==========================================================================
   HOME 1: SERVICE ZIP-CODE CHECKER WIDGET
   ========================================================================== */
function initZipChecker() {
    const input = document.getElementById('zip-code-input');
    const btn = document.getElementById('zip-check-btn');
    const feedback = document.getElementById('zip-feedback');

    if (input && btn && feedback) {
        btn.addEventListener('click', () => {
            const zip = input.value.trim();
            feedback.className = 'zip-feedback-msg ';

            if (/^\d{5}$/.test(zip)) {
                // Valid zip code
                const firstDigit = parseInt(zip.charAt(0));
                if (firstDigit % 2 !== 0) {
                    feedback.classList.add('success');
                    feedback.textContent = `✓ Area Serviced! We have 2 service vans active in Zip ${zip} today. Slots are open!`;
                } else {
                    feedback.classList.add('success');
                    feedback.textContent = `✓ Serviced Area. Dispatch units are booked today; bookings open for tomorrow morning.`;
                }
            } else {
                // Invalid zip code
                feedback.classList.add('error');
                feedback.textContent = `✗ Please enter a valid 5-digit US Zip Code.`;
            }
            feedback.classList.remove('hidden');
        });
    }
}

/* ==========================================================================
   HOME 2: INTERACTIVE timeline (HOW IT WORKS)
   ========================================================================== */
function initTimelineH2() {
    const nodes = document.querySelectorAll('.timeline-node');
    const heading = document.getElementById('timeline-heading');
    const text = document.getElementById('timeline-text');
    const icon = document.getElementById('timeline-icon');

    const stepsData = {
        '1': {
            heading: 'Step 1: Simple Online Booking',
            text: 'Choose your location, vehicle drivetrain specs, and pick a preferred timing block. Our scheduling engine locks the booking.',
            icon: 'fa-laptop-code'
        },
        '2': {
            heading: 'Step 2: Van Dispatched (Real-Time GPS)',
            text: 'A customized, fully equipped mobile workshop departs our dispatch center. You receive a tracking link to watch the unit en route.',
            icon: 'fa-truck-fast'
        },
        '3': {
            heading: 'Step 3: Laser Tread Scanning',
            text: 'Upon arrival, the mechanic scans all four tires using precision laser measurement tools. The exact wear charts populate in your account dashboard.',
            icon: 'fa-barcode'
        },
        '4': {
            heading: 'Step 4: Computerized Balance & Torque',
            text: 'The tires are dismounted, checked on our dynamic dynamic balancing machine, re-torqued to OEM specifications, and pressure calibrated.',
            icon: 'fa-gauge-high'
        }
    };

    nodes.forEach(node => {
        node.addEventListener('click', () => {
            nodes.forEach(n => n.classList.remove('active'));
            node.classList.add('active');

            const step = node.getAttribute('data-step');
            const data = stepsData[step];
            
            if (data) {
                // Trigger CSS card swap animation
                const displayCard = document.getElementById('timeline-display-card');
                if (displayCard) {
                    displayCard.style.opacity = '0';
                    setTimeout(() => {
                        heading.textContent = data.heading;
                        text.textContent = data.text;
                        icon.className = `fa-solid ${data.icon} text-blue`;
                        displayCard.style.opacity = '1';
                    }, 150);
                }
            }
        });
    });
}

/* ==========================================================================
   HOME 2: QUICK SCHEDULER WIDGET
   ========================================================================== */
function initQuickScheduler() {
    const form = document.getElementById('quick-scheduler-form');
    const feedback = document.getElementById('quick-sched-feedback');

    if (form && feedback) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            feedback.className = 'sched-feedback success';
            feedback.textContent = `✓ Available slots found! Dispatch units are free. Redirecting to account portal to finalize booking...`;
            feedback.classList.remove('hidden');

            setTimeout(() => {
                feedback.classList.add('hidden');
                // Redirect to login page
                window.location.href = 'login.html';
            }, 2000);
        });
    }
}

/* ==========================================================================
   ROLE LOGIN MODAL SYSTEM
   ========================================================================== */
/* ==========================================================================
   STANDALONE LOGIN & REGISTRATION SYSTEM
   ========================================================================== */
function initLoginModal() {
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            AppState.user = null;
            localStorage.removeItem('tireglide_logged_in_user');
            
            // Reset indicators
            const ind = document.getElementById('user-indicator');
            const loginBtn = document.getElementById('login-modal-btn');
            const mInd = document.getElementById('mobile-user-indicator');
            const mLoginBtn = document.getElementById('mobile-login-modal-btn');

            if (ind) ind.classList.add('hidden');
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (mInd) mInd.classList.add('hidden');
            if (mLoginBtn) mLoginBtn.classList.remove('hidden');
            
            // Redirect back to Home
            switchView('home1-view');
        });
    }
}

function performLogin(role, name, email) {
    AppState.user = { role, name, email };
    
    const initialsText = name.split(' ').map(n => n.charAt(0)).join('');

    // Update header controls (desktop)
    const loginBtn = document.getElementById('login-modal-btn');
    if (loginBtn) loginBtn.classList.add('hidden');
    
    const indicator = document.getElementById('user-indicator');
    const initials = document.getElementById('user-initials');
    if (initials) initials.textContent = initialsText;
    if (indicator) indicator.classList.remove('hidden');

    // Update header controls (mobile)
    const mLoginBtn = document.getElementById('mobile-login-modal-btn');
    if (mLoginBtn) mLoginBtn.classList.add('hidden');

    const mIndicator = document.getElementById('mobile-user-indicator');
    const mInitials = document.getElementById('mobile-user-initials');
    if (mInitials) mInitials.textContent = initialsText;
    if (mIndicator) mIndicator.classList.remove('hidden');

    // Update Dashboard Sidebar elements
    if (role === 'user') {
        const sbName = document.getElementById('sb-user-name');
        if (sbName) sbName.textContent = name;
        const ovName = document.getElementById('ov-vehicle-name');
        if (ovName) ovName.textContent = '2023 Tesla Model Y';

        const initialsEl = document.getElementById('dashboard-user-initials');
        const welcomeEl = document.getElementById('dashboard-welcome-text');
        if (initialsEl) initialsEl.textContent = initialsText;
        if (welcomeEl) welcomeEl.textContent = `Welcome back, ${name.split(' ')[0]}`;
    }

    if (role === 'admin') {
        const initialsEl = document.getElementById('dashboard-admin-initials');
        const welcomeEl = document.getElementById('dashboard-admin-welcome-text');
        if (initialsEl) initialsEl.textContent = initialsText;
        if (welcomeEl) welcomeEl.textContent = `Welcome back, ${name.split(' ')[0]}`;
    }
}

/* ==========================================================================
   USER DASHBOARD MODULES (WIZARD, TREAD SIM, DISPATCH TELEMETRY)
   ========================================================================== */
function initUserDashboard() {
    // Dashboard sidebar navigation
    const menuItems = document.querySelectorAll('#user-dashboard-view .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const targetPanel = item.getAttribute('data-panel');
            if (targetPanel) {
                switchDashboardPanel(targetPanel);
            }
        });
    });

    // Panel triggers (links inside overview widgets that jump to specific tabs)
    const panelTriggers = document.querySelectorAll('.active-panel-trigger');
    panelTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const panel = trigger.getAttribute('data-panel');
            if (panel) {
                // Find matching menu item in sidebar
                const matchingMenuItem = document.querySelector(`#user-dashboard-view .menu-item[data-panel="${panel}"]`);
                if (matchingMenuItem) {
                    matchingMenuItem.click();
                } else {
                    switchDashboardPanel(panel);
                }
            }
        });
    });

    // Wizard Step Switches
    const btnNext1 = document.getElementById('wiz-next-1');
    const btnNext2 = document.getElementById('wiz-next-2');
    const btnPrev2 = document.getElementById('wiz-prev-2');
    const btnPrev3 = document.getElementById('wiz-prev-3');

    const step1 = document.getElementById('step-1-content');
    const step2 = document.getElementById('step-2-content');
    const step3 = document.getElementById('step-3-content');
    
    const ind1 = document.getElementById('wiz-step-1');
    const ind2 = document.getElementById('wiz-step-2');
    const ind3 = document.getElementById('wiz-step-3');

    if (btnNext1 && btnNext2 && btnPrev2 && btnPrev3) {
        btnNext1.addEventListener('click', () => {
            // Validate step 1 fields
            const vehicle = document.getElementById('wiz-vehicle').value.trim();
            if (!vehicle) {
                alert('Please enter your vehicle make and model.');
                return;
            }
            
            // Go to step 2
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            ind1.classList.remove('active');
            ind2.classList.add('active');
        });

        btnNext2.addEventListener('click', () => {
            // Validate step 2 fields
            const addr = document.getElementById('wiz-address').value.trim();
            const zip = document.getElementById('wiz-zip').value.trim();
            const date = document.getElementById('wiz-date').value.trim();

            if (!addr || !zip || !date) {
                alert('Please fill out all service address and date fields.');
                return;
            }
            if (!/^\d{5}$/.test(zip)) {
                alert('Please enter a valid 5-digit zip code.');
                return;
            }

            // Populate Review screen
            document.getElementById('rev-vehicle').textContent = document.getElementById('wiz-vehicle').value;
            document.getElementById('rev-drivetrain').textContent = document.getElementById('wiz-drivetrain').value.toUpperCase();
            
            const pkgSelect = document.getElementById('wiz-package');
            document.getElementById('rev-service').textContent = pkgSelect.options[pkgSelect.selectedIndex].text;
            document.getElementById('rev-address').textContent = `${addr}, ${zip}`;
            document.getElementById('rev-date').textContent = `${date} (${document.getElementById('wiz-time').value})`;
            
            // Calc estimated price
            const basePrice = AppState.pricing[pkgSelect.value] || 85;
            document.getElementById('rev-price').textContent = `$${basePrice.toFixed(2)}`;

            // Go to step 3
            step2.classList.add('hidden');
            step3.classList.remove('hidden');
            ind2.classList.remove('active');
            ind3.classList.add('active');
        });

        btnPrev2.addEventListener('click', () => {
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
            ind2.classList.remove('active');
            ind1.classList.add('active');
        });

        btnPrev3.addEventListener('click', () => {
            step3.classList.add('hidden');
            step2.classList.remove('hidden');
            ind3.classList.remove('active');
            ind2.classList.add('active');
        });
    }

    // Submit Booking wizard form
    const bookingForm = document.getElementById('booking-wizard-form');
    const wizardFeedback = document.getElementById('booking-wizard-feedback');
    if (bookingForm && wizardFeedback) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const vehicle = document.getElementById('wiz-vehicle').value;
            const pkgSelect = document.getElementById('wiz-package');
            const pkgText = pkgSelect.options[pkgSelect.selectedIndex].text;
            const price = AppState.pricing[pkgSelect.value] || 85;
            const address = document.getElementById('wiz-address').value;
            const date = document.getElementById('wiz-date').value;

            // Add new booking to global array
            const newJob = {
                id: `JOB-${Math.floor(10000 + Math.random() * 90000)}`,
                customer: AppState.user ? AppState.user.name : 'John Doe',
                vehicle: vehicle,
                service: pkgText,
                status: 'Pending Dispatch',
                address: address,
                date: date,
                price: price
            };
            AppState.bookings.push(newJob);

            // Display success notification
            wizardFeedback.textContent = 'Appointment Scheduled Successfully! Van dispatch sequence initialized.';
            wizardFeedback.classList.remove('hidden');

            // Add pending row to user History panel
            const pendingRow = document.getElementById('history-pending-row');
            if (pendingRow) {
                document.getElementById('hist-date').textContent = date;
                document.getElementById('hist-service').textContent = pkgText;
                pendingRow.classList.remove('hidden');
            }

            // Update overview active dispatch widget
            const overviewDispatchWidget = document.getElementById('overview-dispatch-widget');
            if (overviewDispatchWidget) {
                overviewDispatchWidget.innerHTML = `
                    <div class="dispatch-status-chip en-route">
                        <i class="fa-solid fa-truck-moving"></i> Dispatch Confirmed
                    </div>
                    <p style="margin-top: 10px;"><strong>Service:</strong> ${pkgText}</p>
                    <p><strong>Scheduled Date:</strong> ${date}</p>
                    <button class="btn btn-secondary active-panel-trigger" data-panel="user-track" style="margin-top: 10px;">Track Dispatch Unit</button>
                `;
                // Re-bind panel trigger event listeners
                initUserDashboard();
            }

            // Propagate dynamic elements to Admin consoles
            renderAdminJobs();

            setTimeout(() => {
                wizardFeedback.classList.add('hidden');
                // Reset wizard back to step 1
                step3.classList.add('hidden');
                step1.classList.remove('hidden');
                ind3.classList.remove('active');
                ind1.classList.add('active');
                
                // Switch panel to live tracking view
                const trackMenuItem = document.querySelector(`#user-dashboard-view .menu-item[data-panel="user-track"]`);
                if (trackMenuItem) {
                    trackMenuItem.click();
                } else {
                    switchDashboardPanel('user-track');
                }
            }, 1800);
        });
    }

    // Tread depth wear simulator buttons
    const simBtns = document.querySelectorAll('.adjust-tread-btn');
    simBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tire = btn.getAttribute('data-tire');
            const depthSpan = document.getElementById(`depth-${tire}`);
            
            if (depthSpan) {
                let currentVal = parseInt(depthSpan.textContent);
                if (currentVal > 1) {
                    currentVal -= 1;
                    depthSpan.textContent = currentVal;

                    // Update parent indicator color
                    const indicator = depthSpan.parentElement;
                    const statusText = btn.previousElementSibling;
                    
                    indicator.className = 'tread-visual-indicator ';
                    if (currentVal >= 6) {
                        indicator.classList.add('green');
                        statusText.className = 'status-msg text-green';
                        statusText.textContent = `Good (${Math.round(currentVal * 10)}% Left)`;
                    } else if (currentVal >= 3) {
                        indicator.classList.add('amber');
                        statusText.className = 'status-msg text-amber';
                        statusText.textContent = `Caution (${Math.round(currentVal * 10)}% Left)`;
                    } else {
                        indicator.classList.add('red');
                        statusText.className = 'status-msg text-red';
                        statusText.textContent = `Critical (${Math.round(currentVal * 10)}% Left)`;
                    }
                }
            }
        });
    });

    // Tracking Simulator Restart button
    const btnRestartTrack = document.getElementById('btn-restart-van-sim');
    if (btnRestartTrack) {
        btnRestartTrack.addEventListener('click', () => {
            runLiveTrackerSimulation();
        });
    }
}

function switchDashboardPanel(panelId) {
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => p.classList.remove('active'));

    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
        targetPanel.classList.add('active');
        AppState.activeDashboardPanel = panelId;
    }
}

// Live GPS Tracker simulator movement script
function runLiveTrackerSimulation() {
    stopLiveTrackerSimulation();
    
    const vanIcon = document.getElementById('live-moving-van');
    const etaText = document.getElementById('tracking-eta');
    const chip = document.getElementById('tracking-status-chip');
    
    const stepRoute = document.getElementById('log-step-route');
    const stepArrival = document.getElementById('log-step-arrival');

    if (!vanIcon) return;

    AppState.liveTracking.vanPosition = 0;
    AppState.liveTracking.eta = 12;

    if (etaText) etaText.textContent = `12 mins`;
    if (chip) {
        chip.className = 'dispatch-status-chip en-route';
        chip.innerHTML = '<i class="fa-solid fa-truck-moving"></i> En Route';
    }
    if (stepRoute) stepRoute.className = 'log-step active';
    if (stepArrival) stepArrival.className = 'log-step';

    // Position coordinate mapping along route path curve
    // C 30,75 40,40 80,20
    const startX = 15;
    const startY = 80;
    const endX = 80;
    const endY = 20;

    AppState.liveTracking.intervalId = setInterval(() => {
        AppState.liveTracking.vanPosition += 2.5; // speed step
        
        // Calculate dynamic interpolation coordinates (approximate curve linear path)
        const t = AppState.liveTracking.vanPosition / 100;
        
        // Bezier formula curves
        // B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
        // For simplicity: linear coordinate path with curvature adjustment
        const currentX = startX + (endX - startX) * t;
        const currentY = startY + (endY - startY) * t - (Math.sin(t * Math.PI) * 20); // add arched path curve offset

        vanIcon.style.left = `${currentX}%`;
        vanIcon.style.top = `${currentY}%`;

        // Update ETA countdown based on position percentage
        const remainingEta = Math.ceil(12 * (1 - t));
        if (etaText && remainingEta > 0) {
            etaText.textContent = `${remainingEta} mins`;
        }

        if (AppState.liveTracking.vanPosition >= 100) {
            stopLiveTrackerSimulation();
            if (etaText) etaText.textContent = `Arrived`;
            if (chip) {
                chip.className = 'dispatch-status-chip success';
                chip.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                chip.style.color = 'var(--success-color)';
                chip.innerHTML = '<i class="fa-solid fa-circle-check"></i> Arrived';
            }
            if (stepRoute) stepRoute.className = 'log-step completed';
            if (stepArrival) stepArrival.className = 'log-step active';
        }
    }, 400);
}

function stopLiveTrackerSimulation() {
    if (AppState.liveTracking.intervalId) {
        clearInterval(AppState.liveTracking.intervalId);
        AppState.liveTracking.intervalId = null;
    }
}

/* ==========================================================================
   ADMIN FLEET DISPATCHER & CONFIG MANAGERS
   ========================================================================== */
function initAdminDashboard() {
    // Sidebar panels switching
    const menuItems = document.querySelectorAll('#admin-dashboard-view .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const targetPanel = item.getAttribute('data-panel');
            if (targetPanel) {
                switchDashboardPanel(targetPanel);
            }
        });
    });

    // Pricing Editor configuration apply
    const pricingForm = document.getElementById('admin-pricing-form');
    const feedback = document.getElementById('admin-pricing-feedback');

    if (pricingForm && feedback) {
        pricingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            AppState.pricing.rotation = parseFloat(document.getElementById('admin-price-rotation').value);
            AppState.pricing.balancing = parseFloat(document.getElementById('admin-price-balancing').value);
            AppState.pricing.rot_bal = parseFloat(document.getElementById('admin-price-rot-bal').value);
            AppState.pricing.seasonal = parseFloat(document.getElementById('admin-price-seasonal').value);

            feedback.textContent = 'Configuration applied. Service base estimators updated globally!';
            feedback.classList.remove('hidden');

            // Update estimators globally
            initPriceEstimators();

            setTimeout(() => {
                feedback.classList.add('hidden');
            }, 2000);
        });
    }
}

function renderAdminJobs() {
    const tbody = document.getElementById('dispatcher-jobs-body');
    if (!tbody) return;

    // Clear and re-populate
    tbody.innerHTML = '';

    AppState.bookings.forEach(job => {
        const tr = document.createElement('tr');
        
        let dispatchControls = '';
        if (job.status === 'Pending Dispatch') {
            dispatchControls = `
                <div class="btn-group-dispatch">
                    <button class="btn btn-mini btn-primary dispatch-van-btn-action" data-job-id="${job.id}" data-van="1">Dispatch Van #1</button>
                    <button class="btn btn-mini btn-secondary dispatch-van-btn-action" data-job-id="${job.id}" data-van="2">Dispatch Van #2</button>
                </div>
            `;
        } else {
            dispatchControls = `<span class="text-muted">${job.status}</span>`;
        }

        const statusBadgeClass = job.status === 'Completed' ? 'success' : (job.status === 'Pending Dispatch' ? 'warning' : 'success');

        tr.innerHTML = `
            <td>${job.customer}</td>
            <td>${job.vehicle}</td>
            <td>${job.service}</td>
            <td><span class="status-badge ${statusBadgeClass}">${job.status}</span></td>
            <td>${dispatchControls}</td>
        `;
        
        tbody.appendChild(tr);
    });

    // Attach click events to dynamic dispatch actions
    const dispatchActionBtns = document.querySelectorAll('.dispatch-van-btn-action');
    dispatchActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const jobId = btn.getAttribute('data-job-id');
            const vanNum = btn.getAttribute('data-van');
            
            // Find job and update status
            const job = AppState.bookings.find(j => j.id === jobId);
            if (job) {
                job.status = `Van #${vanNum} Dispatched`;
                
                // Increment Revenue Display mock analytics
                const revenueText = document.getElementById('admin-revenue-text');
                if (revenueText) {
                    const currentRev = parseFloat(revenueText.textContent.replace('$', ''));
                    revenueText.textContent = `$${(currentRev + job.price).toFixed(2)}`;
                }

                // Render updates
                renderAdminJobs();
                
                // Visual alerts/logs
                alert(`Unit Dispatched: Van #${vanNum} assigned to job ${jobId} (${job.customer})`);
            }
        });
    });
}

/* ==========================================================================
   HOME 2: ACTIVE SERVICE FOOTPRINT INTERACTIVE SIMULATOR
   ========================================================================== */
function initActiveServiceFootprint() {
    const quadButtons = document.querySelectorAll('.footprint-quadrant-btn');
    const statusLbl = document.getElementById('quadrant-status-lbl');
    const fleetSize = document.getElementById('quadrant-fleet-size');
    const loadStatus = document.getElementById('quadrant-load');
    const vansLayer = document.getElementById('footprint-vans-layer');
    const simBtn = document.getElementById('sim-dispatch-call-btn');

    if (!vansLayer) return;

    // Define coords for vans in each quadrant
    const quadrantData = {
        north: {
            label: 'North Sector',
            fleet: '4',
            load: 'Low',
            vans: [
                { top: 25, left: 30 },
                { top: 35, left: 70 },
                { top: 15, left: 50 },
                { top: 40, left: 20 }
            ]
        },
        metro: {
            label: 'Metro Core',
            fleet: '6',
            load: 'High',
            vans: [
                { top: 45, left: 45 },
                { top: 55, left: 52 },
                { top: 48, left: 60 },
                { top: 60, left: 40 },
                { top: 50, left: 35 },
                { top: 58, left: 58 }
            ]
        },
        east: {
            label: 'East Suburbs',
            fleet: '2',
            load: 'Moderate',
            vans: [
                { top: 45, left: 80 },
                { top: 60, left: 75 }
            ]
        },
        south: {
            label: 'South Quadrant',
            fleet: '3',
            load: 'Low',
            vans: [
                { top: 75, left: 40 },
                { top: 82, left: 60 },
                { top: 70, left: 55 }
            ]
        }
    };

    let activeQuadrant = 'north';

    const renderVans = (quadKey) => {
        vansLayer.innerHTML = '';
        const data = quadrantData[quadKey];
        if (!data) return;

        data.vans.forEach((van, idx) => {
            const vanEl = document.createElement('div');
            vanEl.className = 'footprint-van-pin';
            vanEl.style.top = `${van.top}%`;
            vanEl.style.left = `${van.left}%`;
            vanEl.id = `quad-van-${idx}`;
            vansLayer.appendChild(vanEl);
        });
    };

    quadButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            quadButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const quadKey = btn.getAttribute('data-quadrant');
            activeQuadrant = quadKey;
            const data = quadrantData[quadKey];

            if (data) {
                statusLbl.textContent = data.label;
                fleetSize.textContent = data.fleet;
                loadStatus.textContent = data.load;
                renderVans(quadKey);
            }
        });
    });

    // Initialize display with default active sector
    renderVans('north');

    // Dispatch Call simulation
    if (simBtn) {
        simBtn.addEventListener('click', () => {
            // Check if there is already a simulated target
            const existingTarget = document.getElementById('sim-target-node');
            if (existingTarget) return;

            // Disable dispatch button during animation
            simBtn.disabled = true;
            simBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Dispatching...`;

            // Create client target node on map
            const targetX = 50 + (Math.random() * 20 - 10);
            const targetY = 50 + (Math.random() * 20 - 10);

            const targetNode = document.createElement('div');
            targetNode.id = 'sim-target-node';
            targetNode.style.position = 'absolute';
            targetNode.style.top = `${targetY}%`;
            targetNode.style.left = `${targetX}%`;
            targetNode.style.width = '16px';
            targetNode.style.height = '16px';
            targetNode.style.borderRadius = '50%';
            targetNode.style.backgroundColor = 'var(--danger-color)';
            targetNode.style.boxShadow = '0 0 12px var(--danger-color)';
            targetNode.style.transform = 'translate(-50%, -50%)';
            targetNode.style.zIndex = '6';

            // Pulse ring for simulated client
            const innerRing = document.createElement('div');
            innerRing.style.position = 'absolute';
            innerRing.style.top = '-8px';
            innerRing.style.left = '-8px';
            innerRing.style.width = '32px';
            innerRing.style.height = '32px';
            innerRing.style.border = '2px solid var(--danger-color)';
            innerRing.style.borderRadius = '50%';
            innerRing.className = 'pulse';
            targetNode.appendChild(innerRing);

            vansLayer.appendChild(targetNode);

            // Animate nearest van to target
            setTimeout(() => {
                const vans = document.querySelectorAll('.footprint-van-pin');
                if (vans.length > 0) {
                    // Pick the first van
                    const firstVan = vans[0];
                    firstVan.style.top = `${targetY}%`;
                    firstVan.style.left = `${targetX}%`;

                    setTimeout(() => {
                        // Van arrived!
                        targetNode.style.backgroundColor = 'var(--success-color)';
                        targetNode.style.boxShadow = '0 0 12px var(--success-color)';
                        innerRing.style.borderColor = 'var(--success-color)';
                        simBtn.innerHTML = `<i class="fa-solid fa-check"></i> Dispatched Successfully!`;

                        setTimeout(() => {
                            // Reset simulator
                            targetNode.remove();
                            simBtn.disabled = false;
                            simBtn.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Test Dispatch Simulation`;
                            renderVans(activeQuadrant);
                        }, 2000);
                    }, 1500);
                }
            }, 600);
        });
    }
}
