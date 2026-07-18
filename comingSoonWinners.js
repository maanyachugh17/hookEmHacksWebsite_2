const winnerProjects = [
  {
    name: "SignalTracer- powered by Bloom",
    image: "assets/2025_winners/SignalTracer.png",
    url: "https://devpost.com/software/signaltracer-powered-by-bloom",
  },
  {
    name: "Be My Voices",
    image: "assets/2025_winners/BeMyVoices.png",
    url: "https://devpost.com/software/be-my-voice-iovkah",
  },
  {
    name: "Oath",
    image: "assets/2025_winners/Oath.png",
    url: "https://devpost.com/software/oath",
  },
  {
    name: "PromptShield",
    image: "assets/2025_winners/PromptShield.png",
    url: "https://devpost.com/software/nerd-e3u0zl",
  },
  {
    name: "Estes",
    image: "assets/2025_winners/Estes.png",
    url: "https://devpost.com/software/skillbouncer",
  },
  {
    name: "Ember",
    image: "assets/2025_winners/Ember.png",
    url: "https://devpost.com/software/ember-suj0w2",
  },
];

function createWinnerCard(project) {
  const link = document.createElement("a");
  link.className = "winner-project-card";
  link.href = project.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `${project.name} on Devpost`);

  const image = document.createElement("img");
  image.className = "winner-project-image";
  image.src = project.image;
  image.alt = `${project.name} project image`;
  image.loading = "lazy";

  const title = document.createElement("h3");
  title.className = "winner-project-name";
  title.textContent = project.name;

  link.appendChild(image);
  link.appendChild(title);
  return link;
}

function renderWinnerProjects() {
  const grid = document.getElementById("winnerProjectsGrid");
  if (!grid) return;

  winnerProjects.forEach((project) => {
    grid.appendChild(createWinnerCard(project));
  });
}

document.addEventListener("DOMContentLoaded", renderWinnerProjects);
