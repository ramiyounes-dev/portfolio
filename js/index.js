const img = document.getElementById("mainImage");
const sections = document.querySelectorAll(".section");
const sideMenu = document.querySelector(".side-menu");
const sideLinks = document.querySelectorAll(".side-link");

let isImageAsleep = false;

restoreImageEventListeners();

window.addEventListener("scroll", () => {
    let scrolled = window.scrollY;
    const imageRect = img.getBoundingClientRect();
    const imageHeight = imageRect.height;
    const imageTop = imageRect.top;
    
    if (scrolled > window.innerHeight / 2) {
        sideMenu.style.display = "block";
    } else {
        updateImage("center");
        sideMenu.style.display = "none";
    }

    // Check if the image has surpassed 60% of the viewport height
    if (imageTop < window.innerHeight * 0.1) {
        removeImageEventListeners();
        if (!isImageAsleep) {
            isImageAsleep = true;
        }
    } else {
        restoreImageEventListeners();
        if (isImageAsleep) {
            isImageAsleep = false;
        }
    }

    sections.forEach((section, index) => {
        let rect = section.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
            sideLinks.forEach(link => link.classList.remove("active-section"));
            sideLinks[index].classList.add("active-section");
        }
    });
});


// functions

function updateImage(state) {
    img.src = `assets/welcome_eyes/${state}.png`;
    // console.log(`Position: ${state}`);
}

function removeImageEventListeners() {
    updateImage("asleep");
    img.removeEventListener("mouseover", () => updateImage("asleep"));
    img.removeEventListener("mouseleave", () => updateImage("center"));
    
    addEventListener("mouseup", () => updateImage("asleep"));
    addEventListener("mousedown", () => updateImage("asleep_wink"));
    removeEventListener("mousedown", () => updateImage("center_wink"));
    removeEventListener("mouseup", () => updateImage("center"));

    document.removeEventListener("mousemove", mouseMoveHandler);
    updateImage("asleep");
}

function restoreImageEventListeners() {
    img.addEventListener("mouseover", () => updateImage("asleep"));

    addEventListener("mousedown", () => updateImage("center_wink"));
    addEventListener("mouseup", () => updateImage("center"));
    removeEventListener("mouseup", () => updateImage("asleep"));
    removeEventListener("mousedown", () => updateImage("asleep_wink"));

    img.addEventListener("mouseleave", () => updateImage("center"));
    document.addEventListener("mousemove", mouseMoveHandler);
}

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

document.addEventListener("DOMContentLoaded", function () {
    // Store the initial rotation values from CSS
    const images = document.querySelectorAll('.orbit-img');

    images.forEach((img, index) => {
        setTimeout(() => {
            img.style.transition = "opacity 3s"; // Add a smooth transition
            img.style.opacity = "1"; // Transition to opacity 1
        }, index * 7); // Staggered timing effect
   
        img.addEventListener('click', () => {
            const link = img.getAttribute('data-link');
            if (link) {
                window.location.href = link;
            }
        });

        const originalTransform = window.getComputedStyle(img).transform;  // Get current transform (including rotation)

        // Hover Effect
        img.addEventListener("mouseenter", function () {
            const scaleTransform = 'scale(1.2)';
            img.style.transform = `${originalTransform} ${scaleTransform}`;  // Combine original rotation with scaling
        });

        img.addEventListener("mouseleave", function () {
            img.style.transform = originalTransform;  // Reset to original rotation and any transformations
        });

        // Click Effect (Optional)
        img.addEventListener("click", function () {
            const link = img.getAttribute("data-link");
            img.style.transform = `${originalTransform} scale(0.9)`;  // Shrink slightly on click
            if (link) {
                window.location.href = link;  // Navigate after click
            }
        });
    });
});

// fun for touch screen
document.addEventListener("touchstart", handleInteraction, { passive: true });
function handleInteraction() {
    updateImage("center_wink");
}

function adjustWelcomeSection() {
    const welcomeSection = document.querySelector('.welcome-section');
    const footer = document.querySelector('.end'); // Ensure your footer has a tag or class

    if (welcomeSection && footer) {
        const footerHeight = footer.offsetHeight;
        welcomeSection.style.height = `calc(100vh - ${footerHeight}px)`;
    }
}

// Run on page load and on resize to keep it responsive
window.addEventListener('load', adjustWelcomeSection);
window.addEventListener('resize', adjustWelcomeSection);
