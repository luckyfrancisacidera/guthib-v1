import { MessageCircle, Users, Award, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const testimonials = [
  {
    quote: "I went from zero coding experience to landing my first internship in 6 months. GutHib made everything click.",
    name: "Sarah Chen",
    role: "CS Student, Stanford",
    emoji: "👩‍💻",
  },
  {
    quote: "The step-by-step projects are amazing. I actually understand Git now instead of just copying commands!",
    name: "Marcus Johnson",
    role: "Self-taught developer",
    emoji: "🧑‍💻",
  },
  {
    quote: "Best learning platform for beginners. The community is super supportive and the challenges are fun.",
    name: "Priya Patel",
    role: "Bootcamp graduate",
    emoji: "👩‍🎓",
  },
];

const communityFeatures = [
  { icon: MessageCircle, title: "Study Groups", description: "Join groups by topic or skill level and learn together." },
  { icon: Users, title: "Mentor Matching", description: "Get paired with experienced developers who guide your growth." },
  { icon: Award, title: "Weekly Challenges", description: "Compete in fun coding challenges and climb the leaderboard." },
];

const GHCollaboration = () => {
  return (
    <section className="py-20 lg:py-32 gh-section-border gh-gradient-purple">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
        <p className="text-primary text-sm font-medium text-center mb-3 tracking-wider uppercase">You're not alone</p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-center">
          A community that's got your back
        </h2>
        <p className="text-muted-foreground text-center max-w-lg mx-auto mb-12">
          Learning to code is better with friends. Connect, share, and grow together.
        </p>

        <div className="grid md:grid-cols-3 gap-5 mb-16 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-6">
              <span className="text-3xl mb-3 block">{t.emoji}</span>
              <p className="text-sm text-foreground/90 leading-relaxed mb-4 italic">"{t.quote}"</p>
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {communityFeatures.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="text-center p-6">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="font-display font-semibold mb-2">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-accent hover:underline font-medium">
            Join the community <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GHCollaboration;
