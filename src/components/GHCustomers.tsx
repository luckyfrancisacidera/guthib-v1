import { Code, Globe, Palette, Database, Smartphone, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

const languages = [
  { name: "Python", icon: Code, color: "text-gh-yellow", description: "Perfect first language", level: "Beginner" },
  { name: "JavaScript", icon: Globe, color: "text-gh-yellow", description: "Build for the web", level: "Beginner" },
  { name: "HTML & CSS", icon: Palette, color: "text-gh-orange", description: "Design web pages", level: "Starter" },
  { name: "SQL", icon: Database, color: "text-gh-blue", description: "Work with data", level: "Beginner" },
  { name: "React", icon: Smartphone, color: "text-gh-blue", description: "Build modern apps", level: "Intermediate" },
  { name: "Git & CLI", icon: Terminal, color: "text-gh-purple", description: "Dev essentials", level: "Beginner" },
];

const GHCustomers = () => {
  return (
    <section className="py-20 lg:py-28 gh-section-border gh-gradient-warm">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
        <p className="text-primary text-sm font-medium text-center mb-3 tracking-wider uppercase">Start anywhere</p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-center">
          Pick a language, start building
        </h2>
        <p className="text-muted-foreground text-center max-w-lg mx-auto mb-12">
          Curated learning paths designed for students with zero experience.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {languages.map((lang, i) => {
            const Icon = lang.icon;
            return (
              <Link
                key={i}
                to="/explore"
                className="group flex items-center gap-4 p-5 rounded-xl border border-border bg-card/60 hover:border-primary/40 hover:bg-card transition-all text-left"
              >
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${lang.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm">{lang.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{lang.level}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{lang.description}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GHCustomers;
