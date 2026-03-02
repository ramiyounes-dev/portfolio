const projects = [
    {
      title: "pickle1",
      subtitle: "apple1",
      img: "../assets/welcome_eyes/welcome_sections/AnA_right.png",
      data:`
            <p>Project pickle1 go here...</p>
            <p>More content...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrollingscrollingscrollings croll ingscrolli ngscrollingsc rollin gscrolli ngscro llingsc rolling...</p>
            <p>Keep scrolling...</p> 
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
      `,
      stack:`
            <p><i class="your-icon-class"></i> Technology A1</p>
            <p><i class="your-icon-class"></i> Technology B1</p>
      `
    },
    {
      title: "pickle2",
      subtitle: "apple2",
      img: "../assets/welcome_eyes/welcome_sections/aboutMe_off.png",
      data:`
            <p>Project pickle2 go here...</p>
            <p>More content...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrollingscrollingscrollings croll ingscrolli ngscrollingsc rollin gscrolli ngscro llingsc rolling...</p>
            <p>Keep scrolling...</p> 
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
      `,
      stack:`
            <p><i class="your-icon-class"></i> Technology A2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
            <p><i class="your-icon-class"></i> Technology B2</p>
      `
    },
    {
      title: "pickle3",
      subtitle: "apple3",
      img: "../assets/welcome_eyes/welcome_sections/aboutMe_on.png",
      data:`
            <p>Project pickle3 go here...</p>
            <p>More content...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrollingscrollingscrollings croll ingscrolli ngscrollingsc rollin gscrolli ngscro llingsc rolling...</p>
            <p>Keep scrolling...</p> 
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
      `,
      stack:`
            <p><i class="your-icon-class"></i> Technology A3</p>
            <p><i class="your-icon-class"></i> Technology B3</p>
      `
    },
    {
      title: "pickle6",
      subtitle: "apple6",
      img: "../assets/welcome_eyes/welcome_sections/AnA_left.png",
      data:`
            <p>Project pickle4 go here...</p>
            <p>More content...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrollingscrollingscrollings croll ingscrolli ngscrollingsc rollin gscrolli ngscro llingsc rolling...</p>
            <p>Keep scrolling...</p> 
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
            <p>Keep scrolling...</p>
      `,
      stack:`
            <p><i class="your-icon-class"></i> Technology A4</p>
            <p><i class="your-icon-class"></i> Technology B4</p>
      `
    }
  ];
  
  const container = document.querySelector(".container");
  const cardsDiv = document.querySelector(".cards");
  const infoArea = document.querySelector('.info-area'); 

  const radioContainer = document.createElement("div");
  radioContainer.classList.add("radio-buttons");
  
  projects.forEach((project, index) => {
    // Create radio input
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'slider';
    input.id = `item-${index + 1}`;
    if (index === 0) input.setAttribute("checked", "checked"); // Explicitly set checked attribute
    container.insertBefore(input, cardsDiv);
  });
  
  
  projects.forEach((item, index) => {
    const label = document.createElement("label");
    label.classList.add("card");
    label.setAttribute("for", `item-${index + 1}`);
    label.setAttribute("id", `project-${index + 1}`);
  
    const img = document.createElement("img");
    img.classList.add("project-img");
    img.src = item.img;
    img.alt = "project image";
  
    label.appendChild(img);
    cardsDiv.appendChild(label);
  });

  projects.forEach((project, index) => {
    // Create project info label
    const infoLabel = document.createElement('label');
    infoLabel.classList.add('project-info');
    infoLabel.setAttribute('id', `project-info-${index + 1}`);

    const titleDiv = document.createElement('div');
    titleDiv.classList.add('title');
    titleDiv.textContent = project.title;

    const subLineDiv = document.createElement('div');
    subLineDiv.classList.add('sub-line');

    const subtitleDiv = document.createElement('div');
    subtitleDiv.classList.add('subtitle');
    subtitleDiv.textContent = project.subtitle; // Add subtitle

    subLineDiv.appendChild(subtitleDiv);
    infoLabel.appendChild(titleDiv);
    infoLabel.appendChild(subLineDiv);

    infoArea.appendChild(infoLabel); // Append to info area
  });

  const infoDiv = document.querySelector(".data .content");
  const stackDiv = document.querySelector(".tech-stack .content"); 
  const radioButtons = document.querySelectorAll('input[name="slider"]');

// Update the info div with the corresponding data
infoDiv.innerHTML = projects[0].data;

// Update the tech stack div with the corresponding stack
stackDiv.innerHTML = projects[0].stack;

 // Update the div content when a radio button is checked
radioButtons.forEach((radio, index) => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        // Update the info div with the corresponding data
        infoDiv.innerHTML = projects[index].data;
  
        // Update the tech stack div with the corresponding stack
        stackDiv.innerHTML = projects[index].stack;

        fadeEffect(infoDiv);
        fadeEffect(stackDiv);
        document.querySelectorAll(".content").forEach((element) => {
            if (element.scrollTop > 0) element.scrollTop = 0;
        });
      }
    });
  });


//   css

const numProjects = projects.length;

let cssRules = "";

// Generate CSS for project card transitions
for (let i = 1; i <= numProjects; i++) {
  let prev = i - 1 === 0 ? numProjects : i - 1;
  let next = i + 1 > numProjects ? 1 : i + 1;
  let opposite = i + Math.floor(numProjects / 2) > numProjects ? 
                 ((i + Math.floor(numProjects / 2)) % numProjects) || numProjects : 
                 i + Math.floor(numProjects / 2);

  cssRules += `
    #item-${i}:checked ~ .cards #project-${prev} {
      transform: translateX(-40%) scale(.8);
      opacity: .4;
      z-index: 0;
    }
    #item-${i}:checked ~ .cards #project-${next} {
      transform: translateX(40%) scale(.8);
      opacity: .4;
      z-index: 0;
    }
    #item-${i}:checked ~ .cards #project-${opposite} {
      transform: translateX(0) scale(0.7);
      opacity: 0.2;
      z-index: -1;
    }
    #item-${i}:checked ~ .cards #project-${i} {
      transform: translateX(0) scale(1);
      opacity: 1;
      z-index: 1;
    }
    #item-${i}:checked ~ .cards #project-${i} img {
      box-shadow: 0px 0px 5px 0px rgba(81, 81, 81, 0.47);
    }
  `;
}

// Generate CSS for info and data area transitions
for (let i = 2; i <= numProjects; i++) {
  cssRules += `
    #item-${i}:checked ~ .player #test {
      transform: translateY(-${(i - 1) * 40}px);
    }
  `;
}

// Inject CSS into the document
const styleSheet = document.createElement("style");
styleSheet.innerHTML = cssRules;
document.head.appendChild(styleSheet);

function fadeEffect(element, duration = 1000) {
    let startTime;

    function animateFade(timestamp) {
        if (!startTime) startTime = timestamp;
        let elapsed = timestamp - startTime;
        let progress = elapsed / duration;

        // Ease-in and ease-out fade effect
        let opacity = 0.5 * (1 - Math.cos(Math.PI * progress)); // Smooth fade in and out

        element.style.opacity = opacity.toFixed(2);

        if (elapsed < duration) {
            requestAnimationFrame(animateFade);
        } else {
            element.style.opacity = "1"; // Ensure it ends fully visible
        }
    }

    requestAnimationFrame(animateFade);
}

function adjustXpsHeight() {
    const navbar = document.querySelector(".navbar"); // Adjust selector if needed
    const div = document.querySelector(".main"); // Adjust selector if needed
    const footer = document.querySelector(".end"); // Adjust selector if needed
    if (navbar && footer && div) {
      const navbarHeight = navbar.offsetHeight;
      const footerHeight = footer.offsetHeight;
      // the 20 here refers to the 20px topmargin in the .main
      const availableHeight = window.innerHeight - navbarHeight - footerHeight - 2*20;
      div.style.height = `${availableHeight}px`;
    }
  }
  
  // Adjust height on page load and window resize
  window.addEventListener("load", adjustXpsHeight);
  window.addEventListener("resize", adjustXpsHeight);