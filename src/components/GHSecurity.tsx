import { Star, GitFork, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const projects = [
  {
    title: "Personal Portfolio",
    description: "Build your own developer portfolio with HTML, CSS, and JavaScript.",
    tags: ["HTML", "CSS", "JS"],
    difficulty: "Easy",
    stars: 2340,
    forks: 890,
  },
  {
    title: "To-Do App",
    description: "Create a task manager with React and learn state management basics.",
    tags: ["React", "TypeScript"],
    difficulty: "Easy",
    stars: 1820,
    forks: 640,
  },
  {
    title: "Weather Dashboard",
    description: "Fetch real API data and display weather forecasts with charts.",
    tags: ["JavaScript", "API"],
    difficulty: "Medium",
    stars: 1560,
    forks: 520,
  },
  {
    title: "Chat Application",
    description: "Build a real-time chat app and learn about WebSockets.",
    tags: ["Node.js", "React"],
    difficulty: "Medium",
    stars: 980,
    forks: 310,
  },
];

const difficultyColor: Record<string, string> = {
  Easy: "bg-primary/15 text-primary",
  Medium: "bg-gh-orange/15 text-gh-orange",
};

const GHSecurity = () => {
  return (
    <section className="py-20 lg:py-32 gh-section-border">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
        <p className="text-accent text-sm font-medium text-center mb-3 tracking-wider uppercase">Hands-on learning</p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-center">
          Starter projects you'll actually enjoy
        </h2>
        <p className="text-muted-foreground text-center max-w-lg mx-auto mb-12">
          Guided projects with step-by-step instructions. Fork, customize, and make them yours.
        </p>

        <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {projects.map((project, i) => (
            <Link
              key={i}
              to="/explore"
              className="group rounded-xl border border-border bg-card p-6 hover:border-accent/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-display font-semibold group-hover:text-accent transition-colors">{project.title}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${difficultyColor[project.difficulty]}`}>
                  {project.difficulty}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{project.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{project.stars}</span>
                  <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{project.forks}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/explore" className="inline-flex items-center gap-1 text-sm text-accent hover:underline font-medium">
            Browse all starter projects <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GHSecurity;
