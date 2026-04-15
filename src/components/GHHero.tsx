import { Button } from "./ui/button";
import { Sparkles, Rocket, Code } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const GHHero = () => {
  const { user } = useAuth();

  return (
    <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-28 overflow-hidden gh-gradient-hero">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 text-center relative z-10">
        <div className="absolute top-8 left-[15%] animate-float hidden lg:block">
          <span className="text-4xl">🚀</span>
        </div>
        <div className="absolute top-20 right-[18%] animate-float-delay hidden lg:block">
          <span className="text-3xl">💡</span>
        </div>
        <div className="absolute top-40 left-[10%] animate-float-delay-2 hidden lg:block">
          <span className="text-3xl">⚡</span>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          Built for students & beginner coders
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          Your coding journey
          <br />
          <span className="bg-gradient-to-r from-primary via-gh-blue to-accent bg-clip-text text-transparent">
            starts here
          </span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Learn to code, build real projects, and join a community of thousands of students — all in one beginner-friendly platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="gh-primary" className="h-12 px-8 text-base gap-2" asChild>
            <Link to={user ? "/dashboard" : "/auth"}>
              <Rocket className="w-5 h-5" />
              {user ? "Go to Dashboard" : "Start Learning — It's Free"}
            </Link>
          </Button>
          <Button variant="gh-outline" className="h-12 px-8 text-base gap-2" asChild>
            <Link to="/explore">
              <Code className="w-5 h-5" />
              Explore Projects
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 mt-16 pt-8 border-t border-border">
          {[
            { value: "50K+", label: "Students learning" },
            { value: "200+", label: "Free tutorials" },
            { value: "15+", label: "Languages" },
            { value: "4.9★", label: "Student rating" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GHHero;
