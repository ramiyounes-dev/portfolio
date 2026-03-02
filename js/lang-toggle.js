// Select the elements
const toggle = document.getElementById('lang-toggle');
const cvImgFr = document.getElementById('cv-img-fr');
const cvImgEn = document.getElementById('cv-img-en');
const cvLinkFr = document.getElementById('cv-link-fr');
const cvLinkEn = document.getElementById('cv-link-en');

document.addEventListener('DOMContentLoaded', function() {
    // Check the current state of the checkbox on page load
    if (toggle.checked) {
            // If English is selected
            cvImgFr.style.filter = "blur(5px)";
            cvLinkFr.style.pointerEvents = "none"; // Make it unclickable
            cvImgEn.style.filter = "none";
            cvLinkEn.style.pointerEvents = "auto";
        } else {
            // If French is selected
            cvImgEn.style.filter = "blur(5px)";
            cvLinkEn.style.pointerEvents = "none"; // Make it unclickable
            cvImgFr.style.filter = "none";
            cvLinkFr.style.pointerEvents = "auto";
        }
});


// Function to toggle the blur effect
toggle.addEventListener('change', function() {
  if (toggle.checked) {
    // When English is selected, blur the French image and make it unclickable
    cvImgFr.style.filter = "blur(5px)";
    cvLinkFr.style.pointerEvents = "none"; // Make it unclickable
    
    // Remove the blur and enable clicking for the English image
    cvImgEn.style.filter = "none";
    cvLinkEn.style.pointerEvents = "auto";
  } else {
    // When French is selected, blur the English image and make it unclickable
    cvImgEn.style.filter = "blur(5px)";
    cvLinkEn.style.pointerEvents = "none"; // Make it unclickable
    
    // Remove the blur and enable clicking for the French image
    cvImgFr.style.filter = "none";
    cvLinkFr.style.pointerEvents = "auto";
  }
});


// 
// 
// 
// Get the element
const fr_toggle = document.getElementById('fr-en-toggle');

// Function to scale the element based on the window size
function scaleElement() {
    // Get the width and height of the window
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate scale factor (this example uses 0.15 as the base scale)
    const scaleFactor = Math.min(windowWidth, windowHeight) * 0.0002; // Adjust the multiplier as needed
    
    // Apply the scale to the element
    fr_toggle.style.transform = `scale(${scaleFactor}) translate(-50%, -50%)`;
}

// Call the function on page load and on resize
window.addEventListener('resize', scaleElement);
window.addEventListener('load', scaleElement);
