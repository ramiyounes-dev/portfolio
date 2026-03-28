const SITE_DATA = {
  en: {
    dir: 'ltr', lang: 'en',
    nav: { home: 'Home', about: 'About', experience: 'Experience', projects: 'Projects' },
    hero: {
      greeting: "Hello, I'm", name: 'Rami',
      sentences: [
        'a Software Developer Analyst..',
        'a Mainframe Developer Analyst..',
        'passionate about Teaching..',
        // 'always learning | always coding..'
      ]
    },
    about: {
      heading: 'About Me',
      intro: "I'm a French-Lebanese developer analyst fluent in English, French, and Arabic, driven by curiosity and a passion for solving complex problems. For me, coding is more than a profession — it's a mindset I apply to both technology and life. Outside of work, I stay active through fitness and outdoor adventures, volunteer when I can, and enjoy puzzles, board games, and brain teasers to stay sharp and grounded.",
      educationHeading: 'Education & Certifications',
      education: [
        { icon: 'fas fa-graduation-cap', title: 'PhD in Human-Robot Interaction', org: 'Université Grenoble Alpes', desc: 'Explored multimodal communication in collaborative shared tasks using an industrial robot and planning systems.' },
        { icon: 'fas fa-graduation-cap', title: "Master's in Theoretical Computer Science", org: 'University of Montpellier', desc: 'Focused on computation theory, graph algorithms, and research at LIRMM, INRIA, and CNRS.' },
        { icon: 'fas fa-graduation-cap', title: "Bachelor's in Applied Mathematics & Computer Science", org: 'Lebanese University', desc: 'Built strong foundations in programming, algorithms, and mathematical modeling.' },
        { icon: 'fas fa-award', title: 'Learning Kubernetes (2025)', desc: 'Completed Kubernetes fundamentals via LinkedIn Learning.', certLink: 'https://www.linkedin.com/learning/certificates/86c3c0c76ce673ca1b269254096f1e3afc1a8e871b4e0b224cc6bbef06496c20?trk=share_certificate', certAlt: 'Kubernetes Certificate' },
        { icon: 'fas fa-award', title: 'Docker Foundations Professional Certificate (2025)', desc: 'Completed via LinkedIn Learning; offered by Docker. Covered Docker basics, containers, image management, and docker-compose.', certLink: 'https://www.linkedin.com/learning/certificates/b62b2258e1c44ca9a8c9a8e85e1069513246d4a20dfb1872298b4ff89600f933?trk=share_certificate', certAlt: 'Docker Certificate' },
        { icon: 'fas fa-award', title: 'CISCO CCNA Certification (2017–2018)', desc: 'Completed full CCNA track: network design, protocols, routing, switching, and security.' }
      ],
      skills: {
        heading: 'Skills',
        categories: [
          { label: 'Mainframe', items: [{ icon: 'fas fa-code', text: 'COBOL' }, { icon: 'fas fa-terminal', text: 'JCL' }, { icon: 'fas fa-desktop', text: 'TSO/ISPF' }, { icon: 'fas fa-folder-open', text: 'VSAM' }, { icon: 'fas fa-network-wired', text: 'CICS' }, { icon: 'fas fa-database', text: 'DB2' }, { icon: 'fas fa-project-diagram', text: 'Batch Processing' }, { icon: 'fas fa-exchange-alt', text: 'Transactional Systems' }, { icon: 'fas fa-code', text: 'Eclipse RDZ' }, { icon: 'fas fa-cogs', text: 'Pacbase' }, { icon: 'fas fa-server', text: 'z/OS' }] },
          { label: 'Languages', items: [{ icon: 'fas fa-project-diagram', text: 'Algorithmics' }, { icon: 'fab fa-python', text: 'Python' }, { icon: 'fab fa-js', text: 'JavaScript' }, { icon: 'fab fa-html5', text: 'HTML' }, { icon: 'fab fa-css3', text: 'CSS' }, { icon: 'fab fa-java', text: 'Java' }, { icon: 'fas fa-code', text: 'C#' }, { icon: 'fab fa-php', text: 'PHP' }, { icon: 'fas fa-code', text: 'Prolog' }, { icon: 'fas fa-code', text: 'C++' }, { icon: 'fas fa-chart-line', text: 'R' }, { icon: 'fas fa-code', text: 'LaTeX' }] },
          { label: 'Data & Tools', items: [{ icon: 'fas fa-database', text: 'SQL' }, { icon: 'fas fa-database', text: 'NoSQL' }, { icon: 'fab fa-docker', text: 'Docker' }, { icon: 'fab fa-git-alt', text: 'Git' }, { icon: 'fas fa-cogs', text: 'CI/CD' }, { icon: 'fas fa-cogs', text: 'Kubernetes' }, { icon: 'fas fa-robot', text: 'ROS' }, { icon: 'fas fa-cogs', text: 'MoveIt' }, { icon: 'fas fa-cloud', text: 'REST API' }] },
          { label: 'Soft Skills', items: [{ text: 'Autonomy' }, { text: 'Teamwork' }, { text: 'Adaptability' }, { text: 'Time Management' }, { text: 'Research' }, { text: 'Communication' }, { text: 'Public Speaking' }, { text: 'Continuous Learning' }] }
        ]
      },
      cv: { items: [{ label: 'CV — English', href: './assets/cv/rami_younes_en.pdf' }, { label: 'CV — Français', href: './assets/cv/rami_younes_fr.pdf' }] }
    },
    experience: {
      heading: 'Experience', techLabel: 'Technical Environment', softLabel: 'Soft Skills', coursesLabel: 'Courses Taught', publicationsLabel: 'Publications',
      jobs: [
        { title: 'Mainframe & Large Systems Trainee', company: 'Specialized Training Program', date: 'Jun 2025 – Oct 2025', location: 'Grenoble, France', roleLabel: 'Training — Mainframe & Large Systems', description: 'Completed an intensive, full-stack mainframe bootcamp focused on IBM z/OS environments. Gained hands-on experience with core system components, development tools, batch and transactional processing, and enterprise-grade workflows widely used in banking and industrial systems.', tech: ['COBOL','JCL','TSO/ISPF','VSAM','CICS','DB2','Batch Processing','Transactional Systems','Eclipse RDZ','Pacbase','z/OS','Algorithmics'], techIcons: ['fas fa-code','fas fa-terminal','fas fa-desktop','fas fa-folder-open','fas fa-network-wired','fas fa-database','fas fa-project-diagram','fas fa-exchange-alt','fas fa-code','fas fa-cogs','fas fa-server','fas fa-project-diagram'], soft: ['Adaptability','Problem Solving','Autonomy','Systematic Thinking','Technical Learning','Attention to Detail'] },
        { title: 'Research Engineer', company: 'Gipsa-lab | LIG', date: 'Oct 2020 – Oct 2024', location: 'Grenoble, France', roleLabel: 'Multimodal Human-Robot Collaboration in Shared Tasks', description: 'Worked on a 4-year project examining human-robot interaction dynamics, focusing on how verbal and co-verbal communication influences collaborative task execution. Equipped an industrial ABB robot with hierarchical planning capabilities.', tech: ['Python','JavaScript','HTML','CSS','SQL','REST API','Docker','C++','ROS','MoveIt','RViz','R','Prolog'], techIcons: ['fab fa-python','fab fa-js','fab fa-html5','fab fa-css3','fas fa-database','fas fa-cloud','fab fa-docker','fas fa-laptop-code','fas fa-robot','fas fa-cogs','fas fa-cogs','fas fa-chart-line','fas fa-code'], soft: ['Autonomy','Teamwork','Adaptability','Time Management','Long-term Project','Experimentation','Stats and Evaluation','Public Speaking'], publications: [{ source: 'theses.fr', title: 'Human-robot collaboration and coadaptation in shared tasks', url: 'https://theses.fr/2024GRALT057' }, { source: 'ACL Anthology · SIGDIAL 2022', title: 'Automatic Verbal Depiction of a Brick Assembly for a Robot Instructing Humans', url: 'https://aclanthology.org/2022.sigdial-1.17/' }, { source: 'IEEE', title: 'Impact of verbal instructions and deictic gestures of a cobot on the performance of human coworkers', url: 'https://ieeexplore.ieee.org/abstract/document/10769925' }] },
        { title: 'Intern', company: 'LIRMM', date: 'Feb 2020 – Jul 2020', location: 'Montpellier, France', roleLabel: 'Deep Learning for Constraint Satisfaction Problems', description: 'Used neural networks to assist non-expert users in modeling constraint problems and classifying solutions to complex combinatorial problems. Designed a taxonomy and trained deep learning models for automated classification.', tech: ['Python','Keras','TensorFlow'], techIcons: ['fab fa-python','fas fa-cogs','fas fa-brain'], soft: ['Autonomy','Adaptability','Time Management','Research','Technical Writing'] },
        { title: 'Teaching & Research Associate', company: 'ENSIMAG', date: 'Sep 2023 – Sep 2024', location: 'Grenoble, France', courses: ['Introduction to Networking','Fundamental Logic for Computer Science','Analysis and Design of Software Objects','Relational Database','Unix: Introduction and Shell Programming','C Software Project','Language Theory 1 – 2'], soft: ['Communication','Technical Explanation','Continuous Learning','Public Speaking'] }
      ]
    },
    projects: {
      heading: 'Projects',
      githubLabel: 'View on GitHub',
      items: [
        {
          title: 'Mainframe Banking System',
          description: 'A mainframe-style batch processing system built with GNU COBOL. Simulates a real banking workload — account management, transaction batching, sorted-file merge (appareillage), and packed decimal arithmetic — with a terminal-inspired web UI that visualizes the full batch lifecycle.',
          tech: [
            { icon: 'fas fa-code', text: 'COBOL' },
            { icon: 'fab fa-python', text: 'Python' },
            { icon: 'fas fa-database', text: 'ISAM / Flat Files' },
            { icon: 'fas fa-project-diagram', text: 'Batch Processing' },
            { icon: 'fas fa-terminal', text: 'Terminal UI' }
          ],
          github: 'https://github.com/ramiyounes-dev/portfolio',
          link: './projects/mainframe-banking/showcase/',
          linkLabel: 'View Demo'
        },
        {
          title: 'OnePhone',
          description: 'A local multiplayer party game app for Android featuring 8 games — Charades, Truth Bombs, Hot Potato, Undercover, 20 Questions, Spin the Bottle, Simon, and Word Blitz. Runs entirely offline: no internet, no accounts, no ads. Supports English, French, and Arabic.',
          tech: [
            { icon: 'fas fa-mobile-alt', text: 'Flutter' },
            { icon: 'fas fa-code', text: 'Dart' },
            { icon: 'fab fa-android', text: 'Android' },
            { icon: 'fas fa-music', text: 'Audio' },
            { icon: 'fas fa-globe', text: 'Multilingual' }
          ],
          github: 'https://github.com/ramiyounes-dev/onephone'
        },
        {
          title: 'Explore',
          description: 'Interactive games and projects — featuring Quoridor, Turkish Checkers (Dama), and Connect 4, strategy board games playable locally, against AI, or online.',
          tech: [
            { icon: 'fab fa-js', text: 'JavaScript' },
            { icon: 'fas fa-cube', text: 'Three.js' },
            { icon: 'fas fa-wifi', text: 'WebSocket' },
            { icon: 'fas fa-chess-board', text: 'Board Game' }
          ],
          link: './explore/',
          linkLabel: 'Try it'
        }
      ]
    },
    footer: { copy: '© 2026 Rami Younes' }
  },

  fr: {
    dir: 'ltr', lang: 'fr',
    nav: { home: 'Accueil', about: 'À propos', experience: 'Expérience', projects: 'Projets' },
    hero: {
      greeting: 'Bonjour, je suis', name: 'Rami',
      sentences: [
        'un Analyste Développeur Logiciel..',
        'un Analyste Développeur Mainframe..',
        "passionné par l'Enseignement..",
        // 'toujours en apprentissage | toujours en train de coder..'
      ]
    },
    about: {
      heading: 'À propos',
      intro: "Analyste Développeur franco-libanais, je m'exprime couramment en anglais, français et arabe. Animé par la curiosité et la résolution de problèmes complexes, pour moi le code est bien plus qu'un métier — c'est une façon de penser que j'applique dans tous les aspects de ma vie. En dehors du travail, je pratique le sport et les activités en plein air, et j'aime les puzzles et les casse-têtes pour rester vif et ancré.",
      educationHeading: 'Formation & Certifications',
      education: [
        { icon: 'fas fa-graduation-cap', title: "Doctorat en Interaction Homme-Robot", org: 'Université Grenoble Alpes', desc: 'Exploration de la communication multimodale dans des tâches collaboratives partagées avec un robot industriel et des systèmes de planification.' },
        { icon: 'fas fa-graduation-cap', title: "Master en Informatique Théorique", org: 'Université de Montpellier', desc: 'Théorie de la computation, algorithmes sur graphes, et recherche au LIRMM, INRIA et CNRS.' },
        { icon: 'fas fa-graduation-cap', title: "Licence en Mathématiques Appliquées & Informatique", org: 'Université Libanaise', desc: 'Bases solides en programmation, algorithmique et modélisation mathématique.' },
        { icon: 'fas fa-award', title: 'Kubernetes — Fondamentaux (2025)', desc: 'Fondamentaux Kubernetes via LinkedIn Learning.', certLink: 'https://www.linkedin.com/learning/certificates/86c3c0c76ce673ca1b269254096f1e3afc1a8e871b4e0b224cc6bbef06496c20?trk=share_certificate', certAlt: 'Certification Kubernetes' },
        { icon: 'fas fa-award', title: 'Certificat Professionnel Docker Foundations (2025)', desc: "Complété via LinkedIn Learning, proposé par Docker. Bases Docker, conteneurs, gestion d'images, et docker-compose.", certLink: 'https://www.linkedin.com/learning/certificates/b62b2258e1c44ca9a8c9a8e85e1069513246d4a20dfb1872298b4ff89600f933?trk=share_certificate', certAlt: 'Certification Docker' },
        { icon: 'fas fa-award', title: 'Certification CISCO CCNA (2017–2018)', desc: 'Cursus CCNA complet : conception réseau, protocoles, routage, commutation et sécurité.' }
      ],
      skills: {
        heading: 'Compétences',
        categories: [
          { label: 'Mainframe', items: [{ icon: 'fas fa-code', text: 'COBOL' }, { icon: 'fas fa-terminal', text: 'JCL' }, { icon: 'fas fa-desktop', text: 'TSO/ISPF' }, { icon: 'fas fa-folder-open', text: 'VSAM' }, { icon: 'fas fa-network-wired', text: 'CICS' }, { icon: 'fas fa-database', text: 'DB2' }, { icon: 'fas fa-project-diagram', text: 'Traitement Batch' }, { icon: 'fas fa-exchange-alt', text: 'Systèmes Transactionnels' }, { icon: 'fas fa-code', text: 'Eclipse RDZ' }, { icon: 'fas fa-cogs', text: 'Pacbase' }, { icon: 'fas fa-server', text: 'z/OS' }] },
          { label: 'Langages', items: [{ icon: 'fas fa-project-diagram', text: 'Algorithmique' }, { icon: 'fab fa-python', text: 'Python' }, { icon: 'fab fa-js', text: 'JavaScript' }, { icon: 'fab fa-html5', text: 'HTML' }, { icon: 'fab fa-css3', text: 'CSS' }, { icon: 'fab fa-java', text: 'Java' }, { icon: 'fas fa-code', text: 'C#' }, { icon: 'fab fa-php', text: 'PHP' }, { icon: 'fas fa-code', text: 'Prolog' }, { icon: 'fas fa-code', text: 'C++' }, { icon: 'fas fa-chart-line', text: 'R' }, { icon: 'fas fa-code', text: 'LaTeX' }] },
          { label: 'Données & Outils', items: [{ icon: 'fas fa-database', text: 'SQL' }, { icon: 'fas fa-database', text: 'NoSQL' }, { icon: 'fab fa-docker', text: 'Docker' }, { icon: 'fab fa-git-alt', text: 'Git' }, { icon: 'fas fa-cogs', text: 'CI/CD' }, { icon: 'fas fa-cogs', text: 'Kubernetes' }, { icon: 'fas fa-robot', text: 'ROS' }, { icon: 'fas fa-cogs', text: 'MoveIt' }, { icon: 'fas fa-cloud', text: 'API REST' }] },
          { label: 'Compétences transversales', items: [{ text: 'Autonomie' }, { text: "Travail d'équipe" }, { text: 'Adaptabilité' }, { text: 'Gestion du temps' }, { text: 'Recherche' }, { text: 'Communication' }, { text: 'Prise de parole' }, { text: 'Apprentissage continu' }] }
        ]
      },
      cv: { items: [{ label: 'CV — English', href: './assets/cv/rami_younes_en.pdf' }, { label: 'CV — Français', href: './assets/cv/rami_younes_fr.pdf' }] }
    },
    experience: {
      heading: 'Expérience', techLabel: 'Environnement technique', softLabel: 'Compétences transversales', coursesLabel: 'Cours dispensés', publicationsLabel: 'Publications',
      jobs: [
        { title: 'Stagiaire Mainframe & Grands Systèmes', company: 'Programme de formation spécialisé', date: 'Juin 2025 – Oct. 2025', location: 'Grenoble, France', roleLabel: 'Formation — Mainframe & Grands Systèmes', description: "Bootcamp mainframe intensif centré sur les environnements IBM z/OS. Expérience pratique sur les composants systèmes, outils de développement, traitement batch et transactionnel, largement utilisés dans les secteurs bancaires et industriels.", tech: ['COBOL','JCL','TSO/ISPF','VSAM','CICS','DB2','Traitement Batch','Systèmes Transactionnels','Eclipse RDZ','Pacbase','z/OS','Algorithmique'], techIcons: ['fas fa-code','fas fa-terminal','fas fa-desktop','fas fa-folder-open','fas fa-network-wired','fas fa-database','fas fa-project-diagram','fas fa-exchange-alt','fas fa-code','fas fa-cogs','fas fa-server','fas fa-project-diagram'], soft: ['Adaptabilité','Résolution de problèmes','Autonomie','Pensée systématique','Apprentissage technique','Rigueur'] },
        { title: 'Ingénieur de Recherche', company: 'Gipsa-lab | LIG', date: 'Oct. 2020 – Oct. 2024', location: 'Grenoble, France', roleLabel: 'Collaboration Homme-Robot Multimodale dans des Tâches Partagées', description: "Projet de 4 ans sur la dynamique d'interaction homme-robot, étudiant l'influence de la communication verbale et co-verbale sur l'exécution de tâches collaboratives. Équipement d'un robot industriel ABB avec des capacités de planification hiérarchique.", tech: ['Python','JavaScript','HTML','CSS','SQL','API REST','Docker','C++','ROS','MoveIt','RViz','R','Prolog'], techIcons: ['fab fa-python','fab fa-js','fab fa-html5','fab fa-css3','fas fa-database','fas fa-cloud','fab fa-docker','fas fa-laptop-code','fas fa-robot','fas fa-cogs','fas fa-cogs','fas fa-chart-line','fas fa-code'], soft: ['Autonomie',"Travail d'équipe",'Adaptabilité','Gestion du temps','Projet long terme','Expérimentation','Statistiques','Prise de parole'], publications: [{ source: 'theses.fr', title: 'Human-robot collaboration and coadaptation in shared tasks', url: 'https://theses.fr/2024GRALT057' }, { source: 'ACL Anthology · SIGDIAL 2022', title: 'Automatic Verbal Depiction of a Brick Assembly for a Robot Instructing Humans', url: 'https://aclanthology.org/2022.sigdial-1.17/' }, { source: 'IEEE', title: 'Impact of verbal instructions and deictic gestures of a cobot on the performance of human coworkers', url: 'https://ieeexplore.ieee.org/abstract/document/10769925' }] },
        { title: 'Stagiaire', company: 'LIRMM', date: 'Fév. 2020 – Juil. 2020', location: 'Montpellier, France', roleLabel: 'Apprentissage Profond pour la Satisfaction de Contraintes', description: "Utilisation de réseaux de neurones pour aider des utilisateurs non-experts à modéliser des tâches et classifier les solutions de problèmes combinatoires complexes. Conception d'une taxonomie et entraînement de modèles de deep learning.", tech: ['Python','Keras','TensorFlow'], techIcons: ['fab fa-python','fas fa-cogs','fas fa-brain'], soft: ['Autonomie','Adaptabilité','Gestion du temps','Recherche','Rédaction technique'] },
        { title: "Attaché Temporaire d'Enseignement et de Recherche", company: 'ENSIMAG', date: 'Sep. 2023 – Sep. 2024', location: 'Grenoble, France', courses: ['Introduction aux Réseaux','Logique Fondamentale pour Informatique','Analyse et Conception Objets Logiciels','Base de Données Relationnelle','Unix : Introduction et Shell','Projet Logiciel en C','Théorie des Langages 1 – 2'], soft: ['Communication','Explication technique','Apprentissage continu','Prise de parole'] }
      ]
    },
    projects: {
      heading: 'Projets',
      githubLabel: 'Voir sur GitHub',
      items: [
        {
          title: 'Système Bancaire Mainframe',
          description: 'Un système de traitement batch de style mainframe développé en GNU COBOL. Simule une charge bancaire réelle — gestion de comptes, lots de transactions, fusion de fichiers triés (appareillage) et arithmétique en décimal condensé — avec une interface web inspirée du terminal qui visualise le cycle batch complet.',
          tech: [
            { icon: 'fas fa-code', text: 'COBOL' },
            { icon: 'fab fa-python', text: 'Python' },
            { icon: 'fas fa-database', text: 'ISAM / Fichiers plats' },
            { icon: 'fas fa-project-diagram', text: 'Traitement Batch' },
            { icon: 'fas fa-terminal', text: 'Interface Terminal' }
          ],
          github: 'https://github.com/ramiyounes-dev/portfolio',
          link: './projects/mainframe-banking/showcase/',
          linkLabel: 'Voir la démo'
        },
        {
          title: 'OnePhone',
          description: 'Application de jeux de société multijoueur pour Android avec 8 jeux — Charades, Truth Bombs, Hot Potato, Undercover, 20 Questions, Spin the Bottle, Simon et Word Blitz. Fonctionne entièrement hors ligne : sans internet, sans compte, sans pub. Disponible en anglais, français et arabe.',
          tech: [
            { icon: 'fas fa-mobile-alt', text: 'Flutter' },
            { icon: 'fas fa-code', text: 'Dart' },
            { icon: 'fab fa-android', text: 'Android' },
            { icon: 'fas fa-music', text: 'Audio' },
            { icon: 'fas fa-globe', text: 'Multilingue' }
          ],
          github: 'https://github.com/ramiyounes-dev/onephone'
        },
        {
          title: 'Explore',
          description: 'Projets et jeux interactives — avec Quoridor, les Dames Turques (Dama) et Puissance 4, des jeux de stratégie jouables en local, contre l\'IA, ou en ligne.',
          tech: [
            { icon: 'fab fa-js', text: 'JavaScript' },
            { icon: 'fas fa-cube', text: 'Three.js' },
            { icon: 'fas fa-wifi', text: 'WebSocket' },
            { icon: 'fas fa-chess-board', text: 'Jeu de plateau' }
          ],
          link: './explore/',
          linkLabel: 'Essayer'
        }
      ]
    },
    footer: { copy: '© 2026 Rami Younes' }
  },
};
