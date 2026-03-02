document.addEventListener("DOMContentLoaded", function () {
    const items = document.querySelectorAll(".timeline-item");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, { threshold: 0.3 });
    items.forEach(item => observer.observe(item));
});




function adjustXpsHeight() {
    const navbar = document.querySelector(".navbar"); // Adjust selector if needed
    const footer = document.querySelector(".end"); // Adjust selector if needed
    const timeline = document.querySelector(".timeline");

    if (navbar && footer && timeline) {
      const navbarHeight = navbar.offsetHeight;
      const footerHeight = footer.offsetHeight;
      const availableHeight = window.innerHeight - navbarHeight - footerHeight;
      
      timeline.style.marginTop = `0px`;
      timeline.style.height = `${availableHeight}px`;
    }
  }
  
  // Adjust height on page load and window resize
  window.addEventListener("load", adjustXpsHeight);
  window.addEventListener("resize", adjustXpsHeight);