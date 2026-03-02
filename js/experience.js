
function adjustXpsHeight() {
    const navbar = document.querySelector(".navbar"); // Adjust selector if needed
    const div = document.getElementById("xps"); // Adjust selector if needed
    const footer = document.querySelector(".end"); // Adjust selector if needed
    const xps = document.querySelectorAll(".experience-card");

    if (navbar && footer && xps) {
      const navbarHeight = navbar.offsetHeight;
      const footerHeight = footer.offsetHeight;
      const availableHeight = window.innerHeight - navbarHeight - footerHeight;
    //   div.style.marginTop = `${navbarHeight}px`;
      div.style.height = `${availableHeight}px`;
      xps.forEach((xp) => {
        xp.style.height = `${availableHeight}px`;
        console.log("in");
    });
    }
  }
  
  // Adjust height on page load and window resize
  window.addEventListener("load", adjustXpsHeight);
  window.addEventListener("resize", adjustXpsHeight);