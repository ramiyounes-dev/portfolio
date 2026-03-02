
function updateImage(state) {
    img.src = `assets/welcome_eyes/${state}.png`;
    // console.log(`Position: ${state}`);
}
const img = document.getElementById("backHome");

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".navbar img").forEach(imgs => {
        imgs.addEventListener("click", function() {
            window.location.href = this.getAttribute("data-link");
        });
    });

    
    // Hover Effect
    img.addEventListener("mouseenter", function () {
        if (window.location.pathname.includes("aboutMe"))
            updateImage("welcome_sections/aboutMe_off");
        else if (window.location.pathname.includes("AnA")) 
            updateImage("welcome_sections/AnA_left");
        else if (window.location.pathname.includes("experience")) 
            updateImage("welcome_sections/mat_center");
        else if (window.location.pathname.includes("projects")) 
            updateImage("welcome_sections/projects_off");
        else
            updateImage("center");
        
    });

    img.addEventListener("mouseleave", function () {
        if (window.location.pathname.includes("aboutMe"))
            updateImage("welcome_sections/aboutMe_on");
        else if (window.location.pathname.includes("AnA")) 
            updateImage("welcome_sections/AnA_right");
        else if (window.location.pathname.includes("experience")) 
            updateImage("welcome_sections/mat_asleep");
        else if (window.location.pathname.includes("projects")) 
            updateImage("welcome_sections/projects_on");
        else
            updateImage("asleep");

    });

    // Click Effect (Optional)
    img.addEventListener("click", function () {
        if (window.location.pathname === "/" || window.location.pathname === "/index.html") 
            updateImage("center_wink");
    });

    const images = document.querySelectorAll(".navbar img, .a img");
    images.forEach((img, index) => {
        img.style.opacity = "0"; // Start with opacity 0
        setTimeout(() => {
            img.style.transition = "opacity 0.5s"; // Add a smooth transition
            img.style.opacity = "1"; // Transition to opacity 1
        }, index * 300); // Staggered timing effect
    });
});