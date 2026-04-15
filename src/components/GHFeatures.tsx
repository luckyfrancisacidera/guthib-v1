import { useState } from "react";
import { BookOpen, Code, Users, Zap, Trophy } from "lucide-react";

const tabs = [
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "build", label: "Build", icon: Code },
  { id: "collaborate", label: "Collaborate", icon: Users },
  { id: "practice", label: "Practice", icon: Zap },
  { id: "achieve", label: "Achieve", icon: Trophy },
];

const tabContent: Record<string, { title: string; description: string; steps: string[] }> = {
  learn: {
    title: "Interactive Tutorials",
    description: "Follow step-by-step guides written for absolute beginners. No prior experience needed.",
    steps: ["Pick a language", "Follow guided lessons", "Build as you learn"],
  },
  build: {
    title: "Real-World Projects",
    description: "Build portfolio-worthy projects with starter templates and mentor guidance.",
    steps: ["Choose a template", "Customize your project", "Deploy and share"],
  },
  collaborate: {
    title: "Code Together",
    description: "Pair program with classmates, get code reviews, and learn from the community.",
    steps: ["Join a study group", "Share your code", "Get feedback"],
  },
  practice: {
    title: "Coding Challenges",
    description: "Sharpen your skills with daily challenges from easy to intermediate difficulty.",
    steps: ["Pick a challenge", "Write your solution", "Compare approaches"],
  },
  achieve: {
    title: "Track Progress",
    description: "Earn badges, build streaks, and see your skills grow with visual progress tracking.",
    steps: ["Complete lessons", "Earn badges", "Level up your profile"],
  },
};

const GHFeatures = () => {
  const [activeTab, setActiveTab] = useState("learn");
  const content = tabContent[activeTab];

  return (
    <section className="py-20 lg:py-32 gh-section-border">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
        <p className="text-accent text-sm font-medium text-center mb-3 tracking-wider uppercase">Everything you need</p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-center">
          One platform, zero confusion
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
          From your first "Hello World" to your first pull request — GutHib guides you every step.
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-1 mb-10 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden max-w-3xl mx-auto">
          <div className="p-8 lg:p-10">
            <h3 className="font-display text-2xl font-bold mb-3">{content.title}</h3>
            <p className="text-muted-foreground leading-relaxed mb-8">{content.description}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              {content.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-display font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-sm text-secondary-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-2 bg-gradient-to-r from-primary via-gh-blue to-accent" />
        </div>
      </div>
    </section>
  );
};

export default GHFeatures;
