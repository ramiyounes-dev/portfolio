const img = document.getElementById("mainImage");
const sections = document.querySelectorAll(".section");
const sideMenu = document.querySelector(".side-menu");
const sideLinks = document.querySelectorAll(".side-link");

let isImageAsleep = false;

// Initialize event listeners
restoreImageEventListeners();

window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    const imageRect = img.getBoundingClientRect();
    const imageTop = imageRect.top;

    // Toggle side menu visibility based on scroll position
    sideMenu.style.display = scrolled > window.innerHeight / 2 ? "block" : "none";
    if (scrolled <= window.innerHeight / 2) updateImage("center");

    // Sleep/wake image based on scroll position
    if (imageTop < window.innerHeight * 0.1) {
        if (!isImageAsleep) {
            removeImageEventListeners();
            isImageAsleep = true;
        }
    } else if (isImageAsleep) {
        restoreImageEventListeners();
        isImageAsleep = false;
    }

    // Highlight active section in side menu
    sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
            sideLinks.forEach(link => link.classList.remove("active-section"));
            sideLinks[index].classList.add("active-section");
        }
    });
});

// Update image source
function updateImage(state) {
    img.src = `../assets/welcome_eyes/${state}.png`;
}

// Remove event listeners and set image to asleep
function removeImageEventListeners() {
    updateImage("asleep");

    img.replaceWith(img.cloneNode(true)); // Remove all listeners from img by replacing it
    document.removeEventListener("mousemove", mouseMoveHandler);

    // Remove global listeners
    window.removeEventListener("mousedown", onMouseDownCenterWink);
    window.removeEventListener("mouseup", onMouseUpCenter);
    window.removeEventListener("mousedown", onMouseDownAsleepWink);
    window.removeEventListener("mouseup", onMouseUpAsleep);
}

// Restore event listeners and image to interactive state
function restoreImageEventListeners() {
    // Re-select img after replacement in removeImageEventListeners
    const newImg = document.getElementById("mainImage");

    // Mouseover/mouseleave for image
    newImg.addEventListener("mouseover", () => updateImage("asleep"));
    newImg.addEventListener("mouseleave", () => updateImage("center"));

    // Global mouse events
    window.addEventListener("mousedown", onMouseDownCenterWink);
    window.addEventListener("mouseup", onMouseUpCenter);

    // Remove old handlers for asleep_wink and asleep states if any
    window.removeEventListener("mousedown", onMouseDownAsleepWink);
    window.removeEventListener("mouseup", onMouseUpAsleep);

    // Mouse move
    document.addEventListener("mousemove", mouseMoveHandler);
}

function onMouseDownCenterWink() {
    updateImage("center_wink");
}

function onMouseUpCenter() {
    updateImage("center");
}

function onMouseDownAsleepWink() {
    updateImage("asleep_wink");
}

function onMouseUpAsleep() {
    updateImage("asleep");
}

// Handle mouse movements to update image position
function mouseMoveHandler({ clientX, clientY }) {
    if (isImageAsleep) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    let position = "center";
    if (clientX < width / 3 && clientY < height / 3) position = "up_left";
    else if (clientX > (2 * width) / 3 && clientY < height / 3) position = "up_right";
    else if (clientX < width / 3 && clientY > (2 * height) / 3) position = "down_left";
    else if (clientX > (2 * width) / 3 && clientY > (2 * height) / 3) position = "down_right";
    else if (clientX < width / 3) position = "center_left";
    else if (clientX > (2 * width) / 3) position = "center_right";
    else if (clientY < height / 3) position = "center_up";
    else if (clientY > (2 * height) / 3) position = "center_down";

    updateImage(position);
}

document.addEventListener("DOMContentLoaded", () => {
    const images = document.querySelectorAll('.orbit-img');

    images.forEach((img, index) => {
        setTimeout(() => {
            img.style.transition = "opacity 3s";
            img.style.opacity = "1";
        }, index * 7);

        const originalTransform = window.getComputedStyle(img).transform;

        img.addEventListener('click', () => {
            const link = img.getAttribute('data-link');
            if (link) window.location.href = link;
        });

        img.addEventListener("mouseenter", () => {
            img.style.transform = `${originalTransform} scale(1.2)`;
        });

        img.addEventListener("mouseleave", () => {
            img.style.transform = originalTransform;
        });

        img.addEventListener("click", () => {
            img.style.transform = `${originalTransform} scale(0.9)`;
        });
    });
});

// Touch support for interaction
document.addEventListener("touchstart", () => updateImage("center_wink"), { passive: true });

function adjustWelcomeSection() {
    const welcomeSection = document.querySelector('.welcome-section');
    const footer = document.querySelector('.end');

    if (welcomeSection && footer) {
        welcomeSection.style.height = `calc(100vh - ${footer.offsetHeight}px)`;
    }
}

window.addEventListener('load', adjustWelcomeSection);
window.addEventListener('resize', adjustWelcomeSection);

// Preload images and show content after
window.addEventListener("load", () => {
    const preloadStates = [
        "center", "center_left", "center_right", "center_up", "center_down",
        "up_left", "up_right", "down_left", "down_right",
        "asleep", "asleep_wink", "center_wink"
    ];

    const preloadImages = preloadStates.map(state => new Promise(resolve => {
        const i = new Image();
        i.src = `../assets/welcome_eyes/${state}.png`;
        i.onload = i.onerror = resolve;
    }));

    const existingImages = Array.from(document.images).map(img => new Promise(resolve => {
        if (img.complete) resolve();
        else img.addEventListener("load", resolve);
        img.addEventListener("error", resolve);
    }));

    Promise.all([...preloadImages, ...existingImages]).then(() => {
        const loader = document.getElementById("loading-screen");
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(() => {
                loader.style.display = "none";

                // Show toggle after loader is hidden
                const toggleWrapper = document.getElementById("lang-toggle-wrapper");
                if (toggleWrapper) {
                    toggleWrapper.style.display = "block";
                    // Trigger reflow to restart the transition
                    void toggleWrapper.offsetWidth;
                    toggleWrapper.style.opacity = "1";
                }

            }, 500);
        }
        document.body.style.overflow = "auto";
    });
});
