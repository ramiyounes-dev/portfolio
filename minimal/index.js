const sentences = [
    "a Software Developer",
    "Full Stack is the way to go..",
    "I love clean code and good UI",
    "Always learning | Always coding"
  ];
  
  let currentSentence = 0;
  let currentChar = 0;
  let typing = true;
  
  const textElement = document.getElementById("typewriter-text");
  
  function typeLoop() {
    const sentence = sentences[currentSentence];
  
    if (typing) {
      if (currentChar < sentence.length) {
        textElement.textContent += sentence.charAt(currentChar);
        currentChar++;
        setTimeout(typeLoop, 80);
      } else {
        typing = false;
        setTimeout(typeLoop, 1500); // pause before deleting
      }
    } else {
      if (currentChar > 0) {
        textElement.textContent = sentence.substring(0, currentChar - 1);
        currentChar--;
        setTimeout(typeLoop, 40);
      } else {
        typing = true;
        currentSentence = (currentSentence + 1) % sentences.length;
        setTimeout(typeLoop, 500);
      }
    }
  }
  
  typeLoop();
  