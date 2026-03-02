const contentData = [
    {
        text: `
        <h3>Bachelor's Degree in Applied Mathematics and Computer Science </h3>
        <p>Completed my Bachelor's at Lebanese University
        <a href="https://www.ul.edu.lb/">
          <img src="assets/AnA/lu.png" alt="Bachelor's Degree Image" class="icon-size">
        </a>
        </p>
        <p>The program focused on developing practical skills in programming, problem-solving, and mathematical modeling.</p>
        <p>It provided hands-on experience with different tools, data structures, algorithms, and computational theory, preparing me for real-world applications in software development and system design.</p>
        <p>The combination of mathematics and computer science has allowed me to approach problems analytically while staying grounded in practical implementation.</p>
        `
    },
    {
        text: `
        <h3>Master's in Theoretical Computer Science</h3>
        <p>The Master's program at Montpellier University 
        <a href="https://formations-en.umontpellier.fr/fr/formations/master-XB/master-informatique-ME154.html">
          <img src="assets/AnA/um.png" alt="Master's Degree Image" class="icon-size">
        </a>
        focused on uncovering the fundamental limits of computation and developing efficient algorithms and computational models for solving various computing problems.</p>
        <p>It covered topics like theoretical computer science, optimization, graph theory, and probabilistic algorithms. Practical applications in fields such as cryptography, artificial intelligence, and database systems helped broaden my understanding of both theoretical and applied computing.</p>
        <p>I gained hands-on experience in research units like LIRMM
        <a href="https://www.lirmm.fr/">
          <img src="assets/AnA/lirmm.png" alt="Certifications Image" class="icon-size"">
        </a>
        INRIA
        <a href="https://www.inria.fr/fr">
          <img src="assets/AnA/inria.png" alt="Certifications Image" class="icon-size"">
        </a>
         and CNRS
        <a href="https://www.cnrs.fr/fr">
          <img src="assets/AnA/cnrs.png" alt="Certifications Image" class="icon-size"">
        </a>
         which enhanced my skills in algorithmic complexity and operational research.</p>
        `
    },
    {
        text: `
        <h3>Multimodal Human-Robot Interaction in Shared Tasks</h3>
        <p>My PhD, was conducted at Université Grenoble Alpes 
        <a href="https://www.univ-grenoble-alpes.fr/">
            <img src="assets/AnA/uga.png" alt="Doctorate Image" class="icon-size">
        </a>
         supported by the MIAI grant.</p>
        <p>The research, carried out in collaboration with LIG 
        <a href="https://www.liglab.fr/fr">
            <img src="assets/AnA/lig.png" alt="Doctorate Image" class="icon-size">
        </a>
        and GIPSA-lab
        <a href="https://www.gipsa-lab.grenoble-inp.fr/">
            <img src="assets/AnA/gipsa.png" alt="Doctorate Image" class="icon-size">
        </a>
         investigates how verbal and co-verbal communication impact collaborative tasks with an industrial robot.</p>
        <p>We equipped the robot with hierarchical planning abilities to break tasks into subtasks.</p>
        <p>Through crowdsourcing and in-person experiments, we explored the effects of communication modalities, such as arm gestures, on task performance, particularly in industrial assembly-like scenarios.</p>
        `,
        image: `
        
        
        
        `
    },
    {
        text: `
        <h3 style="text-align:center;">Other Certifications</h3>
        <h4>CISCO Networking Academy CCNA 
         <a href="https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccna/index.html">
          <img src="assets/AnA/ccna.png" alt="Certifications Image" class="icon-size"">
        </a>
        </h4>
        <p><li>2017 CCNA1: Introduces network architecture, protocols, devices, IP addresses, subnetting, topologies, Ethernet, and basic network security fundamentals, with practical experience in Cisco IOS software configuration.</li></p>
        <p><li>2017 CCNA2: Expands on CCNA1, focusing on advanced network concepts and the configuration and troubleshooting of routers and switches. Topics include routing protocols, VLANs, access control lists, WAN technologies, and NAT.</li></p>
        <p><li>2018 CCNA3: Focuses on large-scale network design and configuration, covering advanced switching technologies, OSPF and EIGRP routing protocols, NAT, and network security concepts.</li></p>
        <p><li>2018 CCNA4: Covers WAN technologies, including PPP, Frame Relay, and VPN, along with network management, troubleshooting, and services like DHCP, DNS, and NTP. Emphasizes designing, configuring, and troubleshooting large-scale networks.</li></p>
        `
    }
];

function changeContent(index) {
    const textElement = document.getElementById("text-content");
    const timelineItems = document.querySelectorAll(".timeline-item");
    
    // Remove active class from all items
    timelineItems.forEach(item => item.classList.remove("active"));
    
    // Add active class to selected item
    timelineItems[index].classList.add("active");
    
    // Transition effect
    textElement.classList.remove("visible");
    
    setTimeout(() => {
        textElement.innerHTML = contentData[index].text;
        textElement.classList.add("visible");
    }, 500);
    
    document.querySelectorAll(".text").forEach((element) => {
        if (element.scrollTop > 0) element.scrollTop = 0;
    });
}

// On page load, trigger the transition for the initial text
window.onload = function() {
    const textElement = document.getElementById("text-content");

    // Trigger the text transition after page load
    setTimeout(() => {
        textElement.classList.add("visible");
    }, 500); // Adjust timing for when you want the transition to happen
}