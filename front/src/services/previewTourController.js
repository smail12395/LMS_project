// src/services/previewTourController.js
// Preview-mode only product tour (spotlight walkthrough with Driver.js).
//
// The tour spans several routes, so a single Driver.js instance cannot survive
// page changes. This controller coordinates the tour between routes:
//   - All guided steps are grouped into ordered BLOCKS. Each block lives on a
//     single route and is played with its own Driver.js instance.
//   - `resumeForRoute(pathname, ctx)` is called by each page on mount. It scans
//     forward from the current block and runs the first block that matches the
//     current route (and whose enter-condition matches the page state).
//   - When a block finishes (Next on its last step) the controller navigates to
//     the next block's route via an injected router `navigate`.
//
// IMPORTANT: preview-mode ONLY. Never runs in DB mode, never touches payments,
// enrollments, streaming, watermark logic, authentication or the backend.
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const PREVIEW_TOUR_IDENTITY = 'sarah@example.com';

const STORAGE_KEY = 'lms_tour_state'; // 'completed' | 'skipped' | absent
const RESTART_KEY = 'lms_tour_autostart'; // absent = auto-start allowed

// ---------------------------------------------------------------------------
// Emerald/primary themed driver config.
// ---------------------------------------------------------------------------
const baseConfig = {
  animate: true,
  duration: 300,
  smoothScroll: true,
  allowClose: false,
  overlayColor: '#022c22',
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 14,
  disableActiveInteraction: false,
  popoverClass: 'lms-tour-popover',
  popoverOffset: 12,
  showProgress: true,
  progressText: '{{current}} of {{total}}',
  nextBtnText: 'Next',
  prevBtnText: 'Back',
  doneBtnText: 'Done',
};

const emeraldPopover = (overrides = {}) => ({
  showButtons: ['next', 'previous', 'close'],
  showProgress: true,
  ...overrides,
});

// ---------------------------------------------------------------------------
// BLOCKS
// ---------------------------------------------------------------------------
const BLOCKS = [
  // ---- 1. Home: main navigation ----
  {
    id: 'home-nav',
    page: 'home',
    route: (p) => p === '/',
    build() {
      return [
        {
          element: '[data-tour="nav-language"]',
          popover: emeraldPopover({
            title: 'Choose your language',
            description:
              'Pick your preferred language (English, French or Arabic) before we continue. It updates the whole site instantly.',
            side: 'bottom',
            align: 'end',
          }),
        },
        {
          element: '[data-tour="nav-home"]',
          popover: emeraldPopover({
            title: 'Welcome to the LMS',
            description:
              "Let's take a quick tour of the learning platform. This is your main navigation — the active page is highlighted in emerald.",
            side: 'bottom',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="nav-mycourses"]',
          popover: emeraldPopover({
            title: 'My Courses',
            description:
              'Every course you enroll in is collected here, ready for you to keep learning.',
            side: 'bottom',
            align: 'center',
          }),
        },
        {
          element: '[data-tour="nav-profile"]',
          popover: emeraldPopover({
            title: 'My Profile',
            description:
              'Your account, verification status and personal details live here.',
            side: 'bottom',
            align: 'end',
          }),
        },
        {
          element: '[data-tour="course-filters"]',
          popover: emeraldPopover({
            title: 'Search & filters',
            description:
              "Smoothly scrolled to the catalog. Search by keyword, filter by specialty and sort by newest or oldest.",
            side: 'top',
            align: 'start',
          }),
        },
      ];
    },
  },

  // ---- 2. Home: choose the first unenrolled course ----
  {
    id: 'home-pick',
    page: 'home',
    route: (p) => p === '/',
    build() {
      return [
        {
          element: '[data-tour="first-unenrolled"]',
          popover: emeraldPopover({
            title: 'Choose a course to explore',
            description:
              "Select the highlighted course to explore its learning experience. Nothing is purchased or enrolled yet.",
            side: 'top',
            align: 'center',
          }),
        },
      ];
    },
  },

  // ---- 3. Unenrolled course page ----
  {
    id: 'course-unenrolled',
    page: 'course',
    route: (p) => /^\/course\/[^/]+$/.test(p),
    enter: (ctx) => ctx.isEnrolled === false,
    build() {
      return [
        {
          element: '[data-tour="course-info"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Course information',
            description:
              'Each course shows its description, instructor and key statistics at the top.',
            side: 'bottom',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="course-pricing"]',
          popover: emeraldPopover({
            title: 'Pricing & free course state',
            description:
              'Free courses are clearly marked. Paid courses show their exact price here before you buy.',
            side: 'bottom',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="content-tab"]',
          popover: emeraldPopover({
            title: 'Public / free content',
            description:
              'Before enrolling you can browse the public and free content to preview what the course is like.',
            side: 'top',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="videos-tab"]',
          popover: emeraldPopover({
            title: 'Navigate to Video Series',
            description: 'Click the Videos tab to see the video series.',
            side: 'top',
            align: 'center',
          }),
          advanceOnClick: true,
        },
        {
          element: '[data-tour="locked-video"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Protected premium content',
            description:
              'Premium video content is protected until enrollment. Locked lessons unlock once you enroll.',
            side: 'left',
            align: 'start',
          }),
        },
      ];
    },
    onDone(ctx, { navigate }) {
      const courseId = ctx.courseId;
      if (courseId) navigate(`/pay/${courseId}`);
    },
  },

  // ---- 4. Checkout (simulated in preview) ----
  {
    id: 'pay',
    page: 'pay',
    route: (p) => /^\/pay\/[^/]+$/.test(p),
    build() {
      return [
        {
          element: '[data-tour="coupon-input"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Coupon code',
            description:
              'Apply a coupon code here if you have one. In preview mode this is only simulated.',
            side: 'top',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="stripe-pay"]',
          popover: emeraldPopover({
            title: 'Stripe payment',
            description:
              'Securely pay with Stripe here. This is the real payment point in production.',
            side: 'top',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="pay-note"]',
          popover: emeraldPopover({
            title: 'Preview Mode is simulated',
            description:
              'No real charges, no real enrollments and no Stripe API calls happen in preview mode.',
            side: 'top',
            align: 'center',
          }),
        },
      ];
    },
    onDone(ctx, { navigate }) {
      navigate('/MyCourses');
    },
  },

  // ---- 5. My Courses ----
  {
    id: 'my-courses',
    page: 'my-courses',
    route: (p) => p === '/MyCourses',
    build() {
      return [
        {
          element: '[data-tour="enrolled-course"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Your enrolled courses',
            description:
              "This course is already enrolled, so every lesson is unlocked. Click it to open it and explore the full experience.",
            side: 'bottom',
            align: 'start',
          }),
        },
      ];
    },
  },

  // ---- 6. Enrolled course: navigation, content types, video, quizzes ----
  {
    id: 'course-enrolled',
    page: 'course',
    route: (p) => /^\/course\/[^/]+$/.test(p),
    enter: (ctx) => ctx.isEnrolled === true,
    build() {
      return [
        {
          element: '[data-tour="tabs-bar"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Course navigation',
            description:
              'Once enrolled you get the full internal navigation: Materials, Videos and Quizzes.',
            side: 'bottom',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="content-tab"]',
          popover: emeraldPopover({
            title: 'Content types',
            description:
              'Below you can see the different content types in this course: text, images, PDFs and videos.',
            side: 'top',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="materials-list"]',
          popover: emeraldPopover({
            title: 'Materials',
            description:
              'Text, image and PDF resources are all listed here and are fully accessible once enrolled.',
            side: 'top',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="videos-tab"]',
          popover: emeraldPopover({
            title: 'Video Series',
            description: "Next let's watch a lesson. Click the Videos tab.",
            side: 'top',
            align: 'center',
          }),
          advanceOnClick: true,
        },
        {
          element: '[data-tour="playlist-video"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Open a lesson',
            description: 'Click the highlighted lesson to open it in the player.',
            side: 'left',
            align: 'start',
          }),
          advanceOnClick: true,
        },
        {
          element: '[data-tour="video-player"]',
          waitForElement: 800,
          popover: emeraldPopover({
            title: 'Video player',
            description:
              'A custom player that protects premium video with your personalized watermark.',
            side: 'top',
            align: 'center',
          }),
        },
        {
          element: '[data-tour="video-controls"]',
          popover: emeraldPopover({
            title: 'Playback controls',
            description:
              'Play/pause, skip ±5 seconds, adjust volume and speed, and toggle fullscreen.',
            side: 'top',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="video-watermark"]',
          popover: emeraldPopover({
            title: 'Personalized watermark',
            description: `Videos are watermarked with your identity (${PREVIEW_TOUR_IDENTITY}) to protect premium content.`,
            side: 'bottom',
            align: 'start',
          }),
        },
        {
          element: '[data-tour="quizzes-tab"]',
          popover: emeraldPopover({
            title: 'Quizzes',
            description: 'Finally, let’s see the quizzes. Click the Quizzes tab.',
            side: 'top',
            align: 'center',
          }),
          advanceOnClick: true,
        },
        {
          element: '[data-tour="quiz-list"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Quiz experience',
            description:
              'Each lesson tracks your attempts and progress. Answer the questions to reinforce what you learn.',
            side: 'top',
            align: 'start',
          }),
        },
      ];
    },
    onDone(ctx, { navigate }) {
      navigate('/MyProfile');
    },
  },

  // ---- 7. Profile ----
  {
    id: 'profile',
    page: 'profile',
    route: (p) => p === '/MyProfile',
    build() {
      return [
        {
          element: '[data-tour="profile-info"]',
          waitForElement: 600,
          popover: emeraldPopover({
            title: 'Your profile',
            description:
              'Your account information, verification status, email, phone and membership details all live here.',
            side: 'right',
            align: 'start',
          }),
        },
      ];
    },
    onDone() {
      completeTour();
    },
  },
];

// ---------------------------------------------------------------------------
// Controller state (module singleton, shared across route changes).
// ---------------------------------------------------------------------------
let activeDriver = null;
let currentBlockIndex = 0;
let isRunning = false;
let navigator = null;
let context = {};
const listeners = new Set();

const clearDriver = () => {
  if (activeDriver) {
    try { activeDriver.destroy(); } catch { /* noop */ }
    activeDriver = null;
  }
};

const readState = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
};
const writeState = (v) => {
  if (typeof localStorage === 'undefined') return;
  if (v) localStorage.setItem(STORAGE_KEY, v);
  else localStorage.removeItem(STORAGE_KEY);
};
const clearRestartFlag = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(RESTART_KEY);
};

const emit = () => {
  const state = {
    isRunning,
    block: currentBlockIndex,
    stored: readState(),
  };
  listeners.forEach((fn) => fn(state));
};

export const subscribeTour = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const setTourNavigator = (nav) => { navigator = nav; };

export const tourState = () => ({
  isRunning,
  block: currentBlockIndex,
  stored: readState(),
});

// Preview-only: auto-start only if the user has never completed/skipped and
// has not opted out of auto-start.
export const shouldAutoStartTour = () => {
  if (typeof localStorage === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY) && !localStorage.getItem(RESTART_KEY);
};

export const isTourActive = () => isRunning;

// Destroy any in-flight driver (used on page unmount so the spotlight overlay
// does not linger after navigating to another route).
export const clearActiveDriver = () => clearDriver();

export const setPreviewContext = (ctx) => { context = { ...context, ...ctx }; };

export const completeTour = () => {
  context = {};
  isRunning = false;
  clearDriver();
  clearRestartFlag();
  writeState('completed');
  emit();
};

export const skipTour = () => {
  context = {};
  isRunning = false;
  clearDriver();
  clearRestartFlag();
  writeState('skipped');
  emit();
};

// Start without navigation (used when already on the home page).
export const startTourHere = () => {
  clearRestartFlag();
  clearDriver();
  context = {};
  isRunning = true;
  currentBlockIndex = 0;
  emit();
};

// ---------------------------------------------------------------------------
// Page-local tours (launched by the "Tour" button). These run only the steps
// that belong to the current page, and NEVER navigate to another route.
// ---------------------------------------------------------------------------

const pageForPath = (pathname) => {
  if (pathname === '/') return 'home';
  if (/^\/pay\/[^/]+$/.test(pathname)) return 'pay';
  if (/^\/course\/[^/]+$/.test(pathname)) return 'course';
  if (pathname === '/MyCourses') return 'my-courses';
  if (pathname === '/MyProfile') return 'profile';
  return null;
};

// Returns the blocks that define the tour for a page/context, in order. For the
// course page the enter-condition picks the unenrolled vs enrolled block.
const blocksForPage = (page, ctx) =>
  BLOCKS.filter((b) => b.page === page && (!b.enter || b.enter(ctx)));

const runBlock = (block, opts = {}) => {
  clearDriver();

  const steps = block.build(context);
  const lastIndex = steps.length - 1;

  const mapStep = (step, i) => ({
    ...step,
    onNextClick: () => {
      if (i === lastIndex) {
        if (opts.pageLocal) {
          // Page-local tour: finish in place, never navigate away.
          completeTour();
        } else {
          const done = block.onDone || (() => {});
          done(context, { navigate: navigator });
        }
      }
    },
  });

  const cfg = {
    ...baseConfig,
    steps: steps.map(mapStep),
    onCloseClick: () => skipTour(),
  };
  activeDriver = driver(cfg);
  activeDriver.drive(0);
};

// Combine the steps of several blocks (same page) into a single driver so a
// page-local tour flows continuously without any inter-page navigation.
const runPageLocalTour = (blocks) => {
  const steps = blocks.flatMap((b) => b.build(context));
  const lastIndex = steps.length - 1;

  const mapStep = (step, i) => ({
    ...step,
    onNextClick: () => {
      if (i === lastIndex) completeTour();
    },
  });

  const cfg = {
    ...baseConfig,
    steps: steps.map(mapStep),
    onCloseClick: () => skipTour(),
  };
  activeDriver = driver(cfg);
  activeDriver.drive(0);
};

// Launch the tour for the current page/context only. Reads the live route from
// `window.location` and the last known page context (e.g. enrolled state) stored
// by each page. Never navigates or redirects.
export const startTourForRoute = (pathname, ctx = null) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const currentPath = pathname || window.location.pathname;
  const page = pageForPath(currentPath);
  if (!page) return;

  setPreviewContext(ctx || {});
  const blocks = blocksForPage(page, context);
  if (blocks.length === 0) return;

  clearRestartFlag();
  clearDriver();
  isRunning = true;
  currentBlockIndex = BLOCKS.findIndex((b) => b.id === blocks[0].id);
  emit();
  runPageLocalTour(blocks);
};

// Called by each page on mount; runs the correct block for the current route.
export const resumeForRoute = (pathname, ctx = {}) => {
  if (typeof document === 'undefined') return;
  if (!isRunning) return;
  setPreviewContext(ctx);

  // Scan forward from the current block to find one that hosts this route and
  // whose enter-condition matches (e.g. unenrolled vs enrolled course).
  for (let i = currentBlockIndex; i < BLOCKS.length; i++) {
    const block = BLOCKS[i];
    let routeOk = false;
    try { routeOk = block.route(pathname); } catch { routeOk = false; }
    if (!routeOk) continue;

    let enterOk = true;
    if (block.enter) {
      try { enterOk = block.enter(context); } catch { enterOk = false; }
    }
    if (!enterOk) continue;

    // Prefer running blocks in order; if we found a later block that matches,
    // fast-forward the index (e.g. user clicked a course card to jump ahead).
    currentBlockIndex = i;
    emit();
    runBlock(block);
    return;
  }
};
