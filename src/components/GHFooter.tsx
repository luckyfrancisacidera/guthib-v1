import { Button } from "./ui/button";
import { GraduationCap, Rocket, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const footerLinks = {
  Learn: ["Tutorials", "Challenges", "Projects", "Paths", "Certifications"],
  Platform: ["Features", "Pricing", "Student Plan", "Educators", "API"],
  Community: ["Forums", "Discord", "Study Groups", "Mentors", "Events"],
  Company: ["About", "Blog", "Careers", "Press", "Contact"],
};

const GHFooter = () => {
  const { user } = useAuth();

  return (
    <footer className="gh-section-border">
      <section className="py-20 lg:py-28 relative overflow-hidden gh-gradient-hero">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 text-center relative z-10">
          <span className="text-5xl mb-6 block">🎓</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Ready to write your first line of code?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Join thousands of students who started exactly where you are now. No credit card, no experience needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="gh-primary" className="h-12 px-8 text-base gap-2" asChild>
              <Link to={user ? "/dashboard" : "/auth"}>
                <Rocket className="w-5 h-5" />
                {user ? "Go to Dashboard" : "Start Learning for Free"}
              </Link>
            </Button>
            <Button variant="gh-outline" className="h-12 px-8 text-base" asChild>
              <Link to="/explore">Explore Repositories</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="gh-section-border py-12">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="font-semibold text-sm mb-4">{category}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link}>
                      <Link to="/explore" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-sm">GutHib</span>
              <span className="text-xs text-muted-foreground">© 2025 GutHib, Inc.</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Made with <Heart className="w-3 h-3 text-destructive fill-destructive" /> for students everywhere
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GHFooter;
